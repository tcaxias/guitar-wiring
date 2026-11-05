#!/usr/bin/env python3
"""Discover and optionally download unrepresented Seymour Duncan diagrams.

Discovery follows the public wiring-diagram dropdown values and the site's
public AJAX response. A JSON manifest can be supplied to supplement discovery
when the site's current dropdown responses do not expose complete coverage.

Examples::

    python3 scripts/fetch_sd_diagrams.py
    python3 scripts/fetch_sd_diagrams.py --manifest /path/to/diagrams.json
    python3 scripts/fetch_sd_diagrams.py --download --output-dir ~/Downloads/sd-diagrams

Discovery checks the current public dropdown result sets for Guitar, Bass,
Other, and Misc., plus each exposed pickup type. Its inventory is not a claim
of complete site coverage. Use --manifest to supplement observed results.
Inventory mode is the default. Downloads are sequential, rate-limited, bounded,
and restricted to HTTPS diagram URLs on the site's wiring-diagram path. No
repository destination is selected by default.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import tempfile
import time
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


SITE_HOST = "www.seymourduncan.com"
DIAGRAM_PAGE_URL = f"https://{SITE_HOST}/resources/pickup/wiring-diagrams"
AJAX_URL = f"https://{SITE_HOST}/wp-admin/admin-ajax.php"
DIAGRAM_PATH_PREFIXES = (
    "/images/wiring-diagrams/",
    "/wp-content/uploads/",
)
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"}
KNOWN_REVISION_SUFFIXES = {".rev2"}
CONTENT_TYPE_EXTENSIONS = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
}
EXTENSION_CONTENT_TYPES = {
    ".pdf": {"application/pdf"},
    ".png": {"image/png"},
    ".jpg": {"image/jpeg"},
    ".jpeg": {"image/jpeg"},
    ".gif": {"image/gif"},
    ".webp": {"image/webp"},
}
MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024
MAX_RESPONSE_BYTES = 4 * 1024 * 1024
REQUEST_TIMEOUT_SECONDS = 20
REQUEST_DELAY_SECONDS = 2.0
MAX_ATTEMPTS = 3
TRANSIENT_HTTP_STATUS = {429, 500, 502, 503, 504}
SAFE_FILENAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,199}\Z")
LIBRARY_URL = re.compile(
    r"https://www\.seymourduncan\.com/(?:images/wiring-diagrams|wp-content/uploads)/[^'\"\s]+"
)
QUERY_UFIELDS = (
    "neck",
    "middle",
    "bridge",
    "volumes",
    "tones",
    "selector_switch_type",
    "accessory_pot",
    "display_name",
)
DISCOVERY_FIELDS = {
    "pickup_type",
    "refined_search",
    "fundamentals",
    "guitar_no_of_pickups",
    "bass_no_of_pickups",
    "no_of_pickups",
}
REFINED_SECTIONS = ("Guitar", "Bass", "Other/Misc.")


@dataclass(frozen=True)
class Diagram:
    name: str
    url: str
    filename: str


@dataclass(frozen=True)
class DiscoveryResult:
    diagrams: list[Diagram]
    query_count: int
    successful_queries: int
    nonempty_queries: int
    errors: list[str]


class NoRedirectHandler(HTTPRedirectHandler):
    """Disallow redirects so an allowed URL cannot lead to another host."""

    def redirect_request(self, req: Request, fp: Any, code: int, msg: str,
                         headers: Any, newurl: str) -> None:
        return None


class DropdownParser(HTMLParser):
    """Read exact option values from the page instead of guessing combinations."""

    def __init__(self) -> None:
        super().__init__()
        self.dropdowns: dict[str, list[str]] = {}
        self._field: str | None = None

    def handle_endtag(self, tag: str) -> None:
        if tag == "select":
            self._field = None

    def handle_startendtag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attributes)
        self.handle_endtag(tag)

    def handle_option(self, attributes: list[tuple[str, str | None]]) -> None:
        if self._field is None:
            return
        value = dict(attributes).get("value")
        if value and value not in self.dropdowns[self._field]:
            self.dropdowns[self._field].append(value)

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:  # type: ignore[override]
        if tag == "option":
            self.handle_option(attributes)
            return
        if tag == "select":
            values = dict(attributes)
            field = values.get("name") or values.get("id")
            if field:
                self._field = field.removeprefix("fields[").removesuffix("]")
                selector_id = values.get("id")
                if selector_id in {"guitar_no_of_pickups", "bass_no_of_pickups"}:
                    self._field = selector_id
                self.dropdowns.setdefault(self._field, [])
            else:
                self._field = None


def parse_diagram_url(url: str) -> str:
    """Validate the public file URL and return its safe basename."""
    parsed = urlsplit(url)
    if (
        parsed.scheme != "https"
        or parsed.hostname != SITE_HOST
        or parsed.port is not None
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or not parsed.path.startswith(DIAGRAM_PATH_PREFIXES)
    ):
        raise ValueError(f"URL is outside the allowed diagram origin/path: {url}")

    decoded_path = unquote(parsed.path)
    segments = decoded_path.split("/")
    filename = segments[-1]
    if (
        any(segment in {".", ".."} for segment in segments)
        or not decoded_path.startswith(DIAGRAM_PATH_PREFIXES)
        or not SAFE_FILENAME.fullmatch(filename)
        or filename in {".", ".."}
    ):
        raise ValueError(f"URL has an unsafe filename or path: {url}")
    suffix = Path(filename).suffix.lower()
    if suffix and suffix not in ALLOWED_EXTENSIONS | KNOWN_REVISION_SUFFIXES:
        raise ValueError(f"URL has an unsupported file extension: {url}")
    return filename


def _safe_filename(value: str) -> str:
    filename = unquote(value).strip().strip('"')
    if not SAFE_FILENAME.fullmatch(filename) or filename in {".", ".."}:
        raise ValueError(f"Unsafe diagram filename: {value}")
    return filename


def map_response(payload: Any) -> list[Diagram]:
    """Map keyed API options, legacy parallel arrays, or row responses."""
    if not isinstance(payload, dict):
        raise ValueError("Diagram response must be a JSON object.")
    options = payload.get("options", payload)
    if isinstance(options, list):
        rows = options
    elif isinstance(options, dict):
        if isinstance(options.get("diagrams"), list):
            rows = options["diagrams"]
        elif any(
            isinstance(options.get(field), dict)
            for field in ("display_name", "file_name", "file_url")
        ):
            names = options.get("display_name", {})
            filenames = options.get("file_name", {})
            urls = options.get("file_url", {})
            names = names if isinstance(names, dict) else {}
            filenames = filenames if isinstance(filenames, dict) else {}
            urls = urls if isinstance(urls, dict) else {}
            rows = [
                {
                    "display_name": names.get(identifier),
                    "file_url": urls.get(identifier) or filenames.get(identifier),
                }
                for identifier in dict.fromkeys((*names, *filenames, *urls))
            ]
        elif isinstance(options.get("file_url"), list):
            urls = options["file_url"]
            names = options.get("display_name", [])
            filenames = options.get("file_name", [])
            rows = [
                {
                    "file_url": url,
                    "display_name": names[index] if index < len(names) else "",
                    "file_name": filenames[index] if index < len(filenames) else "",
                }
                for index, url in enumerate(urls)
            ]
        else:
            return []
    else:
        return []

    diagrams: list[Diagram] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        url = row.get("file_url") or row.get("url")
        if not isinstance(url, str):
            continue
        filename = parse_diagram_url(url)
        given_name = row.get("display_name") or row.get("name") or filename
        if not isinstance(given_name, str) or not given_name.strip():
            given_name = filename
        provided_filename = row.get("file_name")
        if isinstance(provided_filename, str) and provided_filename.strip():
            provided_filename = _safe_filename(provided_filename)
            if Path(provided_filename).suffix.lower() in ALLOWED_EXTENSIONS:
                filename = provided_filename
        diagrams.append(Diagram(given_name.strip(), url, filename))
    return diagrams


def parse_dropdowns(page_html: str) -> dict[str, list[str]]:
    parser = DropdownParser()
    parser.feed(page_html)
    return {field: values for field, values in parser.dropdowns.items() if field in DISCOVERY_FIELDS}


def build_discovery_queries(dropdowns: dict[str, list[str]]) -> list[dict[str, str]]:
    """Query exposed pickup types and bounded section/count combinations."""
    queries = [
        {"pickup_type": value}
        for value in dropdowns.get("pickup_type", [])
        if value.strip()
    ]
    pickup_counts = {
        section: dropdowns.get(f"{section.lower()}_no_of_pickups", [])
        for section in ("Guitar", "Bass")
    }
    for section in REFINED_SECTIONS:
        counts = pickup_counts.get(section, [])
        if counts:
            queries.extend(
                {"no_of_pickups": count, "refined_search": section}
                for count in counts
                if count.strip()
            )
        else:
            queries.append({"refined_search": section})
    queries.extend(
        {"refined_search": "Other/Misc.", "fundamentals": value}
        for value in dropdowns.get("fundamentals", [])
        if value.strip()
    )
    unique_queries: list[dict[str, str]] = []
    seen: set[tuple[tuple[str, str], ...]] = set()
    for query in queries:
        key = tuple(sorted(query.items()))
        if key not in seen:
            seen.add(key)
            unique_queries.append(query)
    return unique_queries


def load_manifest(path: Path) -> list[Diagram]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Cannot read manifest {path}: {error}") from error
    if not isinstance(data, dict) or not isinstance(data.get("diagrams"), list):
        raise ValueError('Manifest must be an object with a "diagrams" array.')

    diagrams: list[Diagram] = []
    for index, entry in enumerate(data["diagrams"]):
        if not isinstance(entry, dict):
            raise ValueError(f"Manifest diagrams[{index}] must be an object.")
        name, url = entry.get("name"), entry.get("url")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"Manifest diagrams[{index}] needs a non-empty name.")
        if not isinstance(url, str):
            raise ValueError(f"Manifest diagrams[{index}] needs a URL string.")
        filename = parse_diagram_url(url)
        diagrams.append(Diagram(name.strip(), url, filename))
    return deduplicate_diagrams(diagrams)


def deduplicate_diagrams(diagrams: list[Diagram]) -> list[Diagram]:
    by_url: dict[str, Diagram] = {}
    for diagram in diagrams:
        by_url.setdefault(diagram.url, diagram)
    return [
        Diagram(
            diagram.name,
            diagram.url,
            _url_unique_filename(diagram.filename, diagram.url),
        )
        for diagram in by_url.values()
    ]


def _url_unique_filename(filename: str, url: str) -> str:
    path = Path(filename)
    suffix = path.suffix if path.suffix.lower() in ALLOWED_EXTENSIONS else ""
    stem = filename[: -len(suffix)] if suffix else filename
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
    # Reserve room for a content-type suffix when the public URL has none.
    reserved_suffix_length = len(suffix) if suffix else 5
    stem_limit = 200 - len(digest) - 1 - reserved_suffix_length
    return f"{stem[:stem_limit]}-{digest}{suffix}"


def represented_urls(library_path: Path) -> set[str]:
    try:
        library = library_path.read_text(encoding="utf-8")
    except OSError as error:
        raise ValueError(f"Cannot read library {library_path}: {error}") from error
    return set(LIBRARY_URL.findall(library))


def select_missing(diagrams: list[Diagram], known_urls: set[str]) -> list[Diagram]:
    return [diagram for diagram in diagrams if diagram.url not in known_urls]


def _request(url: str, data: bytes | None = None):
    opener = build_opener(NoRedirectHandler())
    headers = {"User-Agent": "PickupLab public diagram inventory (low-rate)"}
    if data is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
    request = Request(url, data=data, headers=headers)
    return opener.open(request, timeout=REQUEST_TIMEOUT_SECONDS)


def request_json(query: dict[str, str]) -> Any:
    with _request(AJAX_URL, build_ajax_form_data(query)) as response:
        if response.geturl() != AJAX_URL:
            raise ValueError(f"Unexpected AJAX response URL: {response.geturl()}")
        payload = response.read(MAX_RESPONSE_BYTES + 1)
    if len(payload) > MAX_RESPONSE_BYTES:
        raise ValueError(f"AJAX response exceeds {MAX_RESPONSE_BYTES} bytes")
    return json.loads(payload.decode("utf-8"))


def build_ajax_form_data(query: dict[str, str]) -> bytes:
    values: list[tuple[str, str]] = [("action", "sd_get_wiring_diagram")]
    values.extend((f"fields[{field}]", value) for field, value in query.items())
    values.extend(("ufields[]", field) for field in QUERY_UFIELDS)
    return urlencode(values).encode("utf-8")


def discover_diagrams() -> DiscoveryResult:
    with _request(DIAGRAM_PAGE_URL) as response:
        if response.geturl() != DIAGRAM_PAGE_URL:
            raise ValueError(f"Unexpected page response URL: {response.geturl()}")
        page = response.read(MAX_RESPONSE_BYTES + 1)
    if len(page) > MAX_RESPONSE_BYTES:
        raise ValueError(f"Dropdown page exceeds {MAX_RESPONSE_BYTES} bytes")
    dropdowns = parse_dropdowns(page.decode("utf-8", errors="replace"))
    discovered: list[Diagram] = []
    queries = build_discovery_queries(dropdowns)
    successful_queries = 0
    nonempty_queries = 0
    errors: list[str] = []
    for index, query in enumerate(queries):
        if index:
            time.sleep(REQUEST_DELAY_SECONDS)
        try:
            results = map_response(request_json(query))
        except (ValueError, OSError, URLError, HTTPError, json.JSONDecodeError) as error:
            errors.append(f"{query}: {error}")
            continue
        successful_queries += 1
        if results:
            nonempty_queries += 1
        discovered.extend(results)
    return DiscoveryResult(
        deduplicate_diagrams(discovered),
        len(queries),
        successful_queries,
        nonempty_queries,
        errors,
    )


def is_transient(error: Exception) -> bool:
    if isinstance(error, HTTPError):
        return error.code in TRANSIENT_HTTP_STATUS
    if isinstance(error, (TimeoutError, ConnectionError)):
        return True
    return isinstance(error, URLError) and isinstance(
        error.reason, (TimeoutError, ConnectionError)
    )


def _download_filename(diagram: Diagram, headers: Any) -> str:
    # Keep names derived from the validated catalog URL so remote headers cannot
    # make distinct diagrams collide on disk.
    filename = _safe_filename(diagram.filename)
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        suffix = ""
    content_type = headers.get_content_type().lower()
    if not suffix:
        suffix = CONTENT_TYPE_EXTENSIONS.get(content_type, "")
        if suffix:
            filename = f"{filename}{suffix}"
        else:
            raise ValueError(
                f"Cannot identify extensionless diagram content type: {content_type}"
            )
    if suffix and suffix not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported diagram content type or filename: {filename}")
    expected_types = EXTENSION_CONTENT_TYPES[suffix]
    if (
        content_type != "application/octet-stream"
        and content_type not in expected_types
    ):
        raise ValueError(
            f"Unexpected content type for {filename}: {content_type}"
        )
    if not SAFE_FILENAME.fullmatch(filename):
        raise ValueError(f"Unsafe diagram filename from response: {filename}")
    return filename


def existing_local_path(diagram: Diagram, output_dir: Path) -> Path | None:
    filename = _safe_filename(diagram.filename)
    output_path = output_dir / filename
    if output_path.exists():
        return output_path
    if Path(filename).suffix.lower() in ALLOWED_EXTENSIONS:
        return None
    return next(
        (
            output_dir / f"{filename}{extension}"
            for extension in sorted(ALLOWED_EXTENSIONS)
            if (output_dir / f"{filename}{extension}").exists()
        ),
        None,
    )


def download_diagram(diagram: Diagram, output_dir: Path) -> Path:
    # Revalidate immediately before opening a network connection.
    parse_diagram_url(diagram.url)
    existing_path = existing_local_path(diagram, output_dir)
    if existing_path is not None:
        return existing_path
    output_path = output_dir / _safe_filename(diagram.filename)
    output_dir.mkdir(parents=True, exist_ok=True)

    last_error: Exception | None = None
    for attempt in range(MAX_ATTEMPTS):
        temporary_path: Path | None = None
        time.sleep(REQUEST_DELAY_SECONDS * (2**attempt))
        try:
            with _request(diagram.url) as response:
                if response.geturl() != diagram.url:
                    raise ValueError(f"Unexpected response URL: {response.geturl()}")
                filename = _download_filename(diagram, response.headers)
                output_path = output_dir / filename
                if output_path.exists():
                    return output_path
                with tempfile.NamedTemporaryFile(
                    dir=output_dir, prefix=".sd-diagram-", delete=False
                ) as temporary:
                    temporary_path = Path(temporary.name)
                    total_bytes = 0
                    while chunk := response.read(64 * 1024):
                        total_bytes += len(chunk)
                        if total_bytes > MAX_DOWNLOAD_BYTES:
                            raise ValueError(
                                f"Download exceeds {MAX_DOWNLOAD_BYTES} bytes: {diagram.url}"
                            )
                        temporary.write(chunk)
            if output_path.exists():
                temporary_path.unlink(missing_ok=True)
                return output_path
            temporary_path.replace(output_path)
            return output_path
        except Exception as error:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
            if isinstance(error, HTTPError):
                error.close()
            last_error = error
            if not is_transient(error) or attempt == MAX_ATTEMPTS - 1:
                raise
    assert last_error is not None
    raise last_error


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        help="Optional JSON manifest to supplement discovered dropdown results.",
    )
    parser.add_argument(
        "--library",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "src/circuit/library.ts",
        help="Library source used to identify already represented URLs.",
    )
    parser.add_argument(
        "--download", action="store_true", help="Download missing files (default: inventory only)."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Explicit destination required with --download; defaults are never used.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    arguments = parser.parse_args(argv)
    if arguments.download and arguments.output_dir is None:
        parser.error("--download requires an explicit --output-dir")
    coverage_fallback = False
    discovery: DiscoveryResult | None = None
    try:
        try:
            discovery = discover_diagrams()
            diagrams = discovery.diagrams
        except (ValueError, OSError, URLError, HTTPError, json.JSONDecodeError):
            if arguments.manifest is None:
                raise
            diagrams = []
            coverage_fallback = True
        if arguments.manifest is not None:
            diagrams = deduplicate_diagrams(diagrams + load_manifest(arguments.manifest))
        known_urls = represented_urls(arguments.library)
        missing = select_missing(diagrams, known_urls)
    except (ValueError, OSError, URLError, HTTPError, json.JSONDecodeError) as error:
        print(f"Discovery failed: {error}", file=sys.stderr)
        return 2

    print(f"Discovered unique diagrams: {len(diagrams)}")
    print(f"Already represented in library: {len(diagrams) - len(missing)}")
    print(f"Missing from library: {len(missing)}")
    if discovery is not None:
        print(
            "Dropdown queries: "
            f"{discovery.successful_queries}/{discovery.query_count} succeeded; "
            f"{discovery.nonempty_queries} returned diagram URLs"
        )
        if discovery.errors:
            print(f"Discovery query errors: {len(discovery.errors)}", file=sys.stderr)
            for error in discovery.errors:
                print(f"  {error}", file=sys.stderr)
    if coverage_fallback:
        print("Dropdown discovery failed; inventory uses the supplied manifest only.")
    elif arguments.manifest is not None:
        print("Inventory combines dropdown results with the supplied manifest.")
    print(
        "Coverage is not guaranteed complete; discovery reflects observed dropdown result sets."
    )
    failed = bool(discovery and discovery.errors)
    if not missing:
        return 1 if failed else 0

    for diagram in missing:
        local_path = (
            existing_local_path(diagram, arguments.output_dir)
            if arguments.output_dir
            else None
        )
        if local_path is not None:
            print(f"SKIP existing file: {diagram.name} -> {local_path}")
            continue
        if not arguments.download:
            print(f"MISSING: {diagram.name} -> {diagram.filename}\n  {diagram.url}")
            continue
        try:
            destination = download_diagram(diagram, arguments.output_dir)
            print(f"DOWNLOADED: {diagram.name} -> {destination}")
        except (OSError, ValueError, URLError, HTTPError) as error:
            failed = True
            print(f"FAILED: {diagram.name}: {error}", file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
