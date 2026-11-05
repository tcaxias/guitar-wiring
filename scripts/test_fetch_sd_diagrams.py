import json
import tempfile
import unittest
from email.message import Message
from pathlib import Path
from urllib.parse import parse_qs
from unittest.mock import patch

from fetch_sd_diagrams import (
    AJAX_URL,
    DIAGRAM_PAGE_URL,
    QUERY_UFIELDS,
    Diagram,
    _download_filename,
    build_ajax_form_data,
    build_discovery_queries,
    deduplicate_diagrams,
    download_diagram,
    load_manifest,
    map_response,
    parse_diagram_url,
    parse_dropdowns,
    represented_urls,
    select_missing,
    _url_unique_filename,
)


class FetchSeymourDuncanDiagramTests(unittest.TestCase):
    def test_extracts_supported_and_extensionless_url_filenames(self):
        self.assertEqual(
            parse_diagram_url(
                "https://www.seymourduncan.com/images/wiring-diagrams/example-one.pdf"
            ),
            "example-one.pdf",
        )
        self.assertEqual(
            parse_diagram_url(
                "https://www.seymourduncan.com/images/wiring-diagrams/example-one"
            ),
            "example-one",
        )
        self.assertEqual(
            parse_diagram_url(
                "https://www.seymourduncan.com/wp-content/uploads/2026/03/new-upload.pdf"
            ),
            "new-upload.pdf",
        )
        self.assertEqual(
            parse_diagram_url(
                "https://www.seymourduncan.com/images/wiring-diagrams/diagram.rev2"
            ),
            "diagram.rev2",
        )

    def test_rejects_urls_outside_allowed_origin_path_and_filename_rules(self):
        invalid_urls = [
            "http://www.seymourduncan.com/images/wiring-diagrams/example.pdf",
            "https://seymourduncan.com/images/wiring-diagrams/example.pdf",
            "https://www.seymourduncan.com/other/example.pdf",
            "https://www.seymourduncan.com/images/wiring-diagrams/%2e%2e/example.pdf",
            "https://www.seymourduncan.com/images/wiring-diagrams/example.exe",
            "https://www.seymourduncan.com/images/wiring-diagrams/example.pdf?download=1",
            "https://user@www.seymourduncan.com/images/wiring-diagrams/example.pdf",
        ]
        for url in invalid_urls:
            with self.subTest(url=url), self.assertRaises(ValueError):
                parse_diagram_url(url)

    def test_maps_api_parallel_arrays_to_diagrams(self):
        diagrams = map_response(
            {
                "options": {
                    "display_name": ["One pickup", "Two pickups"],
                    "file_name": ["one.pdf", "two"],
                    "file_url": [
                        "https://www.seymourduncan.com/images/wiring-diagrams/one",
                        "https://www.seymourduncan.com/images/wiring-diagrams/two",
                    ],
                }
            }
        )
        self.assertEqual(
            diagrams,
            [
                Diagram(
                    "One pickup",
                    "https://www.seymourduncan.com/images/wiring-diagrams/one",
                    "one.pdf",
                ),
                Diagram(
                    "Two pickups",
                    "https://www.seymourduncan.com/images/wiring-diagrams/two",
                    "two",
                ),
            ],
        )

    def test_maps_id_keyed_response_with_file_url_fallback_and_override(self):
        diagrams = map_response(
            {
                "options": {
                    "display_name": {
                        "i1": "1 Hum, 1 Volume",
                        "i2": "2 Single Coils",
                    },
                    "file_name": {
                        "i1": "https://www.seymourduncan.com/images/wiring-diagrams/one-hum",
                        "i2": "https://www.seymourduncan.com/images/wiring-diagrams/two-single.pdf",
                    },
                    "file_url": {
                        "i2": "https://www.seymourduncan.com/images/wiring-diagrams/new-upload.pdf",
                    },
                }
            }
        )
        self.assertEqual(
            diagrams,
            [
                Diagram(
                    "1 Hum, 1 Volume",
                    "https://www.seymourduncan.com/images/wiring-diagrams/one-hum",
                    "one-hum",
                ),
                Diagram(
                    "2 Single Coils",
                    "https://www.seymourduncan.com/images/wiring-diagrams/new-upload.pdf",
                    "new-upload.pdf",
                ),
            ],
        )

    def test_maps_id_keyed_response_when_file_url_is_empty_list(self):
        diagrams = map_response(
            {
                "options": {
                    "display_name": {"i1": "1 Hum, 1 Volume"},
                    "file_name": {
                        "i1": "https://www.seymourduncan.com/images/wiring-diagrams/one-hum"
                    },
                    "file_url": [],
                }
            }
        )
        self.assertEqual(
            diagrams,
            [
                Diagram(
                    "1 Hum, 1 Volume",
                    "https://www.seymourduncan.com/images/wiring-diagrams/one-hum",
                    "one-hum",
                )
            ],
        )

    def test_maps_row_response_and_rejects_unsafe_urls(self):
        result = map_response(
            {
                "options": [
                    {
                        "display_name": "Diagram",
                        "file_url": "https://www.seymourduncan.com/images/wiring-diagrams/a.pdf",
                    }
                ]
            }
        )
        self.assertEqual(result[0].name, "Diagram")
        with self.assertRaisesRegex(ValueError, "outside the allowed"):
            map_response(
                {
                    "options": {
                        "file_url": ["https://evil.example/images/wiring-diagrams/a.pdf"]
                    }
                }
            )

    def test_discovers_exact_dropdown_values_and_deduplicates_queries(self):
        html = """
        <select name="fields[pickup_type]">
          <option value="">Choose</option>
          <option value="Strats">Strats</option>
          <option value="Wiring Diagrams">Wiring</option>
          <option value="Wiring Diagrams">Duplicate</option>
        </select>
        <select id="refined_search">
          <option value="Guitar">Guitar</option>
          <option value="Bass">Bass</option>
        </select>
        <select id="guitar_no_of_pickups"><option value="1">One</option></select>
        <select id="bass_no_of_pickups"><option value="1">One</option></select>
        """
        dropdowns = parse_dropdowns(html)
        self.assertEqual(
            dropdowns,
            {
                "pickup_type": ["Strats", "Wiring Diagrams"],
                "refined_search": ["Guitar", "Bass"],
                "guitar_no_of_pickups": ["1"],
                "bass_no_of_pickups": ["1"],
            },
        )
        queries = build_discovery_queries(dropdowns)
        self.assertEqual(len(queries), len({tuple(sorted(query.items())) for query in queries}))
        self.assertIn({"no_of_pickups": "1", "refined_search": "Guitar"}, queries)
        self.assertIn({"pickup_type": "Wiring Diagrams"}, queries)
        self.assertNotIn(
            {"pickup_type": "Strats", "refined_search": "Bass", "no_of_pickups": "1"},
            queries,
        )

    def test_canonical_page_and_queries_match_observed_dropdowns(self):
        html = """
        <select id="pickup_type">
          <option value="">Choose</option>
          <option value="Strats">Strats</option>
          <option value="Telecasters">Telecasters</option>
        </select>
        <select name="no_of_pickups" id="guitar_no_of_pickups">
          <option value="1">One</option><option value="2">Two</option><option value="3">Three</option>
        </select>
        <select name="no_of_pickups" id="bass_no_of_pickups">
          <option value="1">One</option><option value="2">Two</option>
        </select>
        <select id="fundamentals">
          <option value="">Select</option><option value="Wiring Misc.">Wiring</option>
          <option value="Switching Misc.">Switching</option>
        </select>
        """
        dropdowns = parse_dropdowns(html)
        queries = build_discovery_queries(dropdowns)
        self.assertEqual(
            DIAGRAM_PAGE_URL,
            "https://www.seymourduncan.com/resources/pickup/wiring-diagrams",
        )
        self.assertEqual(
            queries,
            [
                {"pickup_type": "Strats"},
                {"pickup_type": "Telecasters"},
                {"no_of_pickups": "1", "refined_search": "Guitar"},
                {"no_of_pickups": "2", "refined_search": "Guitar"},
                {"no_of_pickups": "3", "refined_search": "Guitar"},
                {"no_of_pickups": "1", "refined_search": "Bass"},
                {"no_of_pickups": "2", "refined_search": "Bass"},
                {"refined_search": "Other/Misc."},
                {"refined_search": "Other/Misc.", "fundamentals": "Wiring Misc."},
                {"refined_search": "Other/Misc.", "fundamentals": "Switching Misc."},
            ],
        )
        fields = parse_qs(build_ajax_form_data(queries[2]).decode("utf-8"))
        self.assertEqual(fields["action"], ["sd_get_wiring_diagram"])
        self.assertEqual(fields["fields[no_of_pickups]"], ["1"])
        self.assertEqual(fields["fields[refined_search]"], ["Guitar"])
        self.assertEqual(fields["ufields[]"], list(QUERY_UFIELDS))
        self.assertEqual(AJAX_URL, "https://www.seymourduncan.com/wp-admin/admin-ajax.php")

    def test_url_deduplication_and_library_selection(self):
        covered_url = "https://www.seymourduncan.com/images/wiring-diagrams/covered.pdf"
        missing_url = "https://www.seymourduncan.com/images/wiring-diagrams/new.pdf"
        diagrams = [
            Diagram("Covered", covered_url, "covered.pdf"),
            Diagram("Same file", covered_url, "covered.pdf"),
            Diagram("New", missing_url, "new.pdf"),
        ]
        self.assertEqual(len(deduplicate_diagrams(diagrams)), 2)
        with tempfile.TemporaryDirectory() as temporary_directory:
            library_path = Path(temporary_directory) / "library.ts"
            library_path.write_text(f"sourceUrl: '{covered_url}'", encoding="utf-8")
            known_urls = represented_urls(library_path)
        missing = select_missing(deduplicate_diagrams(diagrams), known_urls)
        self.assertEqual([diagram.url for diagram in missing], [missing_url])

    def test_distinct_urls_with_same_basename_get_distinct_local_names(self):
        diagrams = deduplicate_diagrams(
            [
                Diagram(
                    "First",
                    "https://www.seymourduncan.com/images/wiring-diagrams/shared.pdf",
                    "shared.pdf",
                ),
                Diagram(
                    "Second",
                    "https://www.seymourduncan.com/images/wiring-diagrams/archive/shared.pdf",
                    "shared.pdf",
                ),
            ]
        )
        self.assertEqual(len({diagram.filename for diagram in diagrams}), 2)

    def test_distinct_urls_with_case_only_filename_difference_get_distinct_names(self):
        diagrams = deduplicate_diagrams(
            [
                Diagram(
                    "Uppercase",
                    "https://www.seymourduncan.com/images/wiring-diagrams/upper.pdf",
                    "Diagram.pdf",
                ),
                Diagram(
                    "Lowercase",
                    "https://www.seymourduncan.com/images/wiring-diagrams/lower.pdf",
                    "diagram.pdf",
                ),
            ]
        )
        filenames = [diagram.filename.casefold() for diagram in diagrams]
        self.assertEqual(len(filenames), len(set(filenames)))

    def test_extensionless_and_suffixed_urls_cannot_collide_after_type_inference(self):
        diagrams = deduplicate_diagrams(
            [
                Diagram(
                    "Extensionless",
                    "https://www.seymourduncan.com/images/wiring-diagrams/diagram",
                    "diagram",
                ),
                Diagram(
                    "PDF",
                    "https://www.seymourduncan.com/images/wiring-diagrams/diagram.pdf",
                    "diagram.pdf",
                ),
            ]
        )
        extensionless_pdf = f"{diagrams[0].filename}.pdf".casefold()
        self.assertNotEqual(extensionless_pdf, diagrams[1].filename.casefold())

    def test_manifest_validation_and_library_selection(self):
        url = "https://www.seymourduncan.com/images/wiring-diagrams/covered.pdf"
        uploaded_url = "https://www.seymourduncan.com/wp-content/uploads/2026/03/covered.pdf"
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory)
            manifest_path = directory / "manifest.json"
            manifest_path.write_text(
                json.dumps({"diagrams": [{"name": "Covered", "url": url}]}),
                encoding="utf-8",
            )
            library_path = directory / "library.ts"
            library_path.write_text(
                f"sourceUrl: '{url}'\nsourceUrl: '{uploaded_url}'", encoding="utf-8"
            )
            known_urls = represented_urls(library_path)
            self.assertEqual(
                load_manifest(manifest_path),
                [Diagram("Covered", url, _url_unique_filename("covered.pdf", url))],
            )
        self.assertEqual(known_urls, {url, uploaded_url})

    def test_extensionless_download_uses_response_content_type(self):
        diagram = Diagram(
            "PDF diagram",
            "https://www.seymourduncan.com/images/wiring-diagrams/example",
            "example",
        )
        response_headers = Message()
        response_headers["Content-Type"] = "application/pdf"

        class FakeResponse:
            headers = response_headers

            def __enter__(self):
                return self

            def __exit__(self, *_arguments):
                return None

            def geturl(self):
                return diagram.url

            def read(self, _size=-1):
                if getattr(self, "read_once", False):
                    return b""
                self.read_once = True
                return b"pdf"

        with tempfile.TemporaryDirectory() as temporary_directory:
            with patch("fetch_sd_diagrams._request", return_value=FakeResponse()), patch(
                "fetch_sd_diagrams.time.sleep"
            ):
                path = download_diagram(diagram, Path(temporary_directory))
            self.assertEqual(path.name, "example.pdf")
            self.assertEqual(path.read_bytes(), b"pdf")

    def test_revision_tag_url_gets_media_extension_from_response(self):
        url = "https://www.seymourduncan.com/images/wiring-diagrams/diagram.rev2"
        diagram = Diagram("Revision diagram", url, _url_unique_filename("diagram.rev2", url))
        headers = Message()
        headers["Content-Type"] = "application/pdf"
        self.assertTrue(_download_filename(diagram, headers).endswith(".pdf"))

    def test_extensionless_download_rejects_unknown_content_type(self):
        diagram = Diagram(
            "HTML error page",
            "https://www.seymourduncan.com/images/wiring-diagrams/example",
            "example",
        )
        response_headers = Message()
        response_headers["Content-Type"] = "text/html"
        with self.assertRaisesRegex(ValueError, "Cannot identify extensionless"):
            _download_filename(diagram, response_headers)

    def test_download_uses_catalog_name_and_rejects_mismatched_content_type(self):
        diagram = Diagram(
            "Catalog diagram",
            "https://www.seymourduncan.com/images/wiring-diagrams/catalog.pdf",
            "catalog.pdf",
        )
        response_headers = Message()
        response_headers["Content-Type"] = "application/pdf"
        response_headers["Content-Disposition"] = 'attachment; filename="shared.pdf"'
        self.assertEqual(_download_filename(diagram, response_headers), "catalog.pdf")

        response_headers.replace_header("Content-Type", "text/html")
        with self.assertRaisesRegex(ValueError, "Unexpected content type"):
            _download_filename(diagram, response_headers)

    def test_existing_local_file_is_not_requested_or_overwritten(self):
        diagram = Diagram(
            "Existing",
            "https://www.seymourduncan.com/images/wiring-diagrams/example.pdf",
            "example.pdf",
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            output_directory = Path(temporary_directory)
            output_path = output_directory / diagram.filename
            output_path.write_bytes(b"existing")
            with patch("fetch_sd_diagrams._request") as request:
                result = download_diagram(diagram, output_directory)
                self.assertEqual(result, output_path)
                self.assertEqual(output_path.read_bytes(), b"existing")
                request.assert_not_called()

    def test_existing_extensionless_download_is_found_by_inferred_suffix(self):
        diagram = Diagram(
            "Extensionless",
            "https://www.seymourduncan.com/images/wiring-diagrams/example",
            "example-hash",
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            output_directory = Path(temporary_directory)
            output_path = output_directory / "example-hash.pdf"
            output_path.write_bytes(b"existing")
            with patch("fetch_sd_diagrams._request") as request:
                result = download_diagram(diagram, output_directory)
                self.assertEqual(result, output_path)
                self.assertEqual(output_path.read_bytes(), b"existing")
                request.assert_not_called()


if __name__ == "__main__":
    unittest.main()
