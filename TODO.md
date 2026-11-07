# TODOs

## In progress

- **Gretsch wiring schematic JSON configs** — 5 circuits added to `src/circuit/library.ts` and `src/circuit/gretsch-*.json`. Verified against Gretsch wiring conventions. Need to verify against actual source PDFs (PDFs could not be fetched during this session).

## Open

- **Diagram format for sharing/printing** — undecided. SVG was explored (3 `.puml` PlantUML files in `docs/plants/`) but not finalized. Need to decide on a format that most apps can read and print (SVG, PDF, PNG, etc.).

## Done

- **Multi-volume circuit support** — `src/circuit/analyze.ts` updated to handle circuits with multiple volume pots (Gretsch architecture). All 360 vitest + 106 Playwright tests pass.
- **Light theme contrast fixes** — `src/styles.css` knob numbers now use `--ink` (dark) on light background; `--muted` darkened from `#7a7a6a` to `#5a5950`; panel subtitle uses `--muted`.
- **Knob number color per pot type** — `src/components/Board.tsx` adds `knob-number-volume` / `knob-number-tone` classes; `src/styles.css` maps volume→`--amber`, tone→`--teal` in both themes.
- **Gretsch library entries** — 5 circuits added to `exampleLibrary` (Setzer Hot Rod, G6122 Country Gentleman, Tone Pot, Tone Switch, Tone/Standby Switch).
