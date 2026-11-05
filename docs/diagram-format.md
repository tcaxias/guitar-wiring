# Diagram format

Supply an editable diagram as a version 2 JSON file containing `metadata`,
`parts`, and `wires`. Author the connections using the terminal IDs below and
check physical hardware against the [hardware reference](hardware-reference.md).
The [model](../src/circuit/model.ts) defines the format; the
[parser](../src/circuit/portable.ts) accepts validated JSON for exchange.

## Fields and limits

The [validator](../src/circuit/validation.ts) accepts exactly the required fields
plus the optional part fields below. All ranges include both endpoints.

| Object   | Required fields and accepted values                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root     | `version`: number `2`; `metadata`: object; `parts` and `wires`: arrays                                                                                                                            |
| Metadata | Strings: `title` up to 80 characters, `creator` up to 120, `sourceUrl` up to 2,048, `permission` up to 500. Empty strings are accepted. A populated `sourceUrl` is an absolute HTTP or HTTPS URL. |
| Part     | `id`, `kind`, `label`, `x`, `y`, `value`, `position`; see below                                                                                                                                   |
| Wire     | `id`, `from`, `to`; endpoints are strings in `part-id:terminal-name` form                                                                                                                         |

- **Size:** up to 24 parts, 80 wires, and 120,000 characters of JSON text.
- **IDs:** 1–60 ASCII letters, digits, underscores, or hyphens. Names owned by
  `Object.prototype`, such as `constructor`, `toString`, and `__proto__`, are
  reserved. Part IDs are unique within parts; wire IDs are unique within wires.
- **Parts:** `kind` is one of the table entries below; `label` is a string of
  1–40 characters. `x` and `y` are finite numbers in 0–900 and 0–525 respectively.
- **Settings:** every part includes numeric `value` and string `position`.
  Capacitors accept `value` 22, 47, 12, or 3.9; `blade4` accepts integers 1–4;
  `varitone` accepts integers 1–6. All other kinds accept 0–10, including
  fractional values. `position` accepts `neck`, `both`, or `bridge` and remains
  required for compatibility, including on parts controlled by `value` or `isPulled`.
- **Wires:** each endpoint identifies an existing terminal. Endpoints differ,
  and each terminal pair appears once, counting reversed pairs as duplicates.

### Optional part fields

Earlier v2 files remain valid with these fields omitted. Each field is accepted
only on the listed kinds, including when a boolean value is `false`.

| Field               | Accepted kinds                                         | Accepted values and meaning                              |
| ------------------- | ------------------------------------------------------ | -------------------------------------------------------- |
| `resistanceKOhms`   | `volume`, `tone`, `push-pull-volume`, `push-pull-tone` | Number: 250, 500, or 1000; nominal pot rating            |
| `skin`              | `pickup`                                               | `p90` or `dynasonic`; single-coil appearance             |
| `skin`              | `humbucker`                                            | `filtertron` or `mini-humbucker`; humbucking appearance  |
| `hasSeparateShield` | `pickup`                                               | Boolean; `true` adds a `shield` terminal labelled SHIELD |
| `isPulled`          | `push-pull-volume`, `push-pull-tone`                   | Boolean; `true` selects pulled contacts                  |

Omitted or `false` `hasSeparateShield` keeps the pickup's two terminals.
Omitted or `false` `isPulled` selects the pushed contacts.

Omitted pot ratings display as 500 kΩ for compatibility, with the original data
preserved. The educational control model remains linear, distinct from hardware
audio taper. Skins represent generic physical variants; actual lead counts,
split capability, and wire colors require the exact manufacturer's diagram.
See [pickup variants](hardware-reference.md#pickup-variants).

### Attribution

Use metadata for the title, creator credit, source link, and verified reuse
information. Reuse rights come from the rights holder's license or permission;
metadata records that information. Supply original artwork and authored wiring,
following the [project's authorship boundaries](../CONTRIBUTING.md#boundaries).
The title labels the board and supplies the export filename. Edit it under
**Diagram & attribution** in Edit mode, then choose **Save attribution**.

## Terminal IDs

Prefix each exact, case-sensitive terminal name with the part ID and a colon,
for example `volume-1:wiper`. Names come from the
[terminal definitions](../src/circuit/model.ts).

| `kind`             | Terminal names                                                         |
| ------------------ | ---------------------------------------------------------------------- |
| `pickup`           | `hot`, `return`; also `shield` when `hasSeparateShield` is `true`      |
| `humbucker`        | `a-start`, `a-finish`, `b-start`, `b-finish`, `shield`                 |
| `blade`            | `a-common`, `a1`, `a2`, `a3`, `b-common`, `b1`, `b2`, `b3`             |
| `blade4`           | `a-common`, `a1`, `a2`, `a3`, `a4`, `b-common`, `b1`, `b2`, `b3`, `b4` |
| `selector`         | `neck`, `common`, `bridge` (legacy simplified selector)                |
| `volume`           | `input` (lug 3), `wiper` (lug 2), `ground` (lug 1), `casing`           |
| `tone`             | `input` (lug 1), `wiper` (lug 2), `unused` (lug 3), `casing`           |
| `push-pull-volume` | All `volume` terminals plus the six switch terminals below             |
| `push-pull-tone`   | All `tone` terminals plus the six switch terminals below               |
| `varitone`         | `signal`, `ground`                                                     |
| `capacitor`        | `a`, `b`                                                               |
| `jack`             | `tip`, `sleeve`                                                        |
| `ground`           | `common`                                                               |

Pot lug numbers use the [logical pot convention](hardware-reference.md#volume-and-tone-pots);
verify physical orientation against the manufacturer's diagram. For a `blade`,
`neck`, `both`, and `bridge` select throws 1, 2, and 3 on both poles. External
jumpers establish the pickup combinations described in the
[blade reference](hardware-reference.md#three-way-blade-switch).

### Push-pull and four-way contacts

Both push-pull kinds add `switch-a-common`, `switch-a1`, `switch-a2`,
`switch-b-common`, `switch-b1`, and `switch-b2`. Each switch pole is electrically
independent of the pot and the other pole. Pushed connects each common to its
throw 1; pulled connects each to throw 2. Pot rotation uses `value`, independently
of `isPulled`. See the [coil-split reference](hardware-reference.md#push-pull-coil-split).

For `blade4`, `value` selects the matching throw on both poles: at 4,
`a-common` connects to `a4` and `b-common` to `b4`. The authored four-way example
uses **1 neck, 2 parallel, 3 bridge, 4 series**. Preserve its separate neck-cover
`shield` ground while switching `return`; see the
[four-way reference](hardware-reference.md#four-way-blade-switch).

### Varitone module

The `varitone` part contains a prewired LC shunt between `signal` and `ground`.
Its `value` selects **1 bypass**, then **2–6: 1, 3, 10, 30, or 220 nF**, each in
series with a **1.5 H** choke. These internal component values are fixed by the
[model](../src/circuit/model.ts); author external wires to the two terminals.
The frequency reference is ideal LC resonance. Loaded response, notch depth,
and bandwidth require a fuller model; see the
[LC approximation](hardware-reference.md#lc-varitone-approximation).

## Ground junctions

A `ground` part is an explicit junction, for example `ground-1:common`.
Connect it by wire to the jack's `sleeve`; multiple junctions join only through
authored connections. Direct return-to-sleeve wiring remains valid. See the
[signal-ground convention](hardware-reference.md#signal-ground).

The [analyzer](../src/circuit/analyze.ts) reports `groundNodes` separately from
saved diagram data: `isConnected` is `false` for floating, `true` for connected,
and `null` for ambiguous multiple-jack circuits. `isActive` distinguishes an
active return from a connected idle junction. `groundWireLevels` marks active
return paths with `1`; absent entries mean zero activity. This is binary
connectivity, distinct from current or amplitude. Shield/casing-only branches
stay static; shared paths used by active returns can light.

## Minimal example

This two-lead pickup connects directly to a mono jack. Every part carries all
seven required fields, including settings for parts without controls.

```json
{
  "version": 2,
  "metadata": {
    "title": "Pickup to jack",
    "creator": "",
    "sourceUrl": "",
    "permission": ""
  },
  "parts": [
    {
      "id": "pickup-1",
      "kind": "pickup",
      "label": "Pickup",
      "x": 80,
      "y": 100,
      "value": 10,
      "position": "both"
    },
    {
      "id": "jack-1",
      "kind": "jack",
      "label": "Output jack",
      "x": 500,
      "y": 100,
      "value": 10,
      "position": "both"
    }
  ],
  "wires": [
    { "id": "wire-1", "from": "pickup-1:hot", "to": "jack-1:tip" },
    { "id": "wire-2", "from": "pickup-1:return", "to": "jack-1:sleeve" }
  ]
}
```

## Exported examples

Start from an exported preset or [library example](../src/circuit/library.ts):
standard Tele, push-pull coil split, four-way Tele, or LC Varitone Tele.
The [serializer](../src/circuit/portable.ts) validates each circuit before
producing editable v2 JSON with its parts, wires, settings, and metadata.
The library's reference-based examples carry creator credit, a source URL, and
reuse-information metadata. Those records identify the reference; reuse rights
come from the rights holder's license or permission.

## Version 1 compatibility

The [parser](../src/circuit/portable.ts) also accepts valid version 1 objects
with exactly `version`, `parts`, and `wires`. Migration preserves their parts,
wires, positions, and settings, sets version 2, and adds metadata with the title
`Restored circuit` and three empty strings. Version 1 accepts the original
`pickup`, `selector`, `volume`, `tone`, `capacitor`, and `jack` kinds and terminals.
Version 2 adds `ground`, `humbucker`, `blade`, `blade4`, `push-pull-volume`,
`push-pull-tone`, `varitone`, and pot `casing`/`unused` connections. The optional
fields `resistanceKOhms`, `skin`, `hasSeparateShield`, and `isPulled` also belong
to v2; their presence in a v1 object causes validation to fail.

Earlier valid v2 objects pass through migration unchanged, preserving metadata,
parts, wiring, settings, and omitted optional fields. Defaults apply when reading
the fields; loading preserves the original object.
The old generated title `Imported legacy build` displays as `Restored circuit`;
its stored metadata remains intact until explicitly edited. Loading preserves
the existing parts; use **Preset** to try the standard Tele-style circuit and
**Undo** to restore the previous diagram.

[Browser storage](../src/storage.ts) reads `pickup-lab:circuit:v2` first. When
that key is absent, it loads and migrates `pickup-lab:circuit:v1`, retaining the
original saved copy. Subsequent saves use the version 2 key.
