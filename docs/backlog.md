# Backlog

## Diagram collection (deferred)

Resume when source PDFs and images are available.

- [ ] First collect source URLs and the corresponding PDFs or images.
- [ ] Rebuild selected diagrams as native editable circuits using the
      [diagram format](diagram-format.md) and [hardware reference](hardware-reference.md).
- [ ] Record creator, source URL, and verified reuse information in metadata.
- [ ] Verify every control state, validate the diagram format, and add the
      circuits to the [Library](../src/circuit/library.ts).

## Picture-in-picture guitar view (deferred)

Optional side panel showing a Stratocaster-style body outline where selecting
a schematic wire highlights the corresponding physical lead path. Needs:

- [ ] Original SVG guitar artwork (body, pickups, pots, switch, jack)
- [ ] Physical position model mapping schematic terminals to body locations
- [ ] Highlight logic tracing wire → physical positions
- [ ] `GuitarView.tsx` component toggled from **More**
- [ ] Theme-aware colors (reuse existing `--wire-*` variables)

## Sample sounds (deferred, likely hard)

Playback of sample audio so users can hear how circuit changes affect tone.
Requires audio synthesis/sampling infrastructure outside the current
browser-only, visual-only scope. Research needed before any implementation.
