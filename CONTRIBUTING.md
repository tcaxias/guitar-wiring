# Contributing

Keep the loop short: run the app, make one small change, test it, and inspect it
in the browser. Read [AGENTS.md](AGENTS.md) and [README.md](README.md) first.

## Personal Git identity

Every commit author and committer must be
**Tiago Caxias <12184375+tcaxias@users.noreply.github.com>**.
Configure identity locally in this repository:

```sh
git config --local user.name "Tiago Caxias"
git config --local user.email "12184375+tcaxias@users.noreply.github.com"
git config --local user.useConfigOnly true
npm run hooks:install
npm run identity:check
```

Before each commit, verify the local configuration and resolved identities:

```sh
git config --local --get user.name
git config --local --get user.email
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
npm run identity:check
```

Stop on any mismatch, including an environment override. The
[identity checker](scripts/check-git-identity.mjs) verifies repository-local
settings and both resolved identities. The installed
[pre-commit hook](.githooks/pre-commit) runs this check; `npm run check` runs it
again. Preserve attribution trailers added by tooling.

## Change loop

1. Follow the [startup instructions](README.md#start). Choose a small,
   reviewable change and a work-oriented branch name allowed by [AGENTS.md](AGENTS.md).
2. Keep circuit analysis pure and separate from rendering and persistence.
   Keep layout changes in the UI, using the shared controller in `App.tsx` and
   shared `PartControl` controls. Preserve the circuit model and analyzer contracts.
   Gate new user-visible behavior through documented local feature flags.
3. Add deterministic tests for the changed behavior:
   - **Switching:** both blade poles, all four-way positions, A/B coil splits,
     separate cover grounds, DPDT independence from pot rotation, and volume/tone endpoints.
   - **Graphs:** series/parallel/mixed reduction, conflicting polarity, irreducible
     bridges, dangling branches, bounded reduction, shorts, and disconnected outputs.
   - **Returns:** floating/idle/active ground junctions, shared paths, static
     shield/casing branches, and ambiguous multiple-jack estimates.
     Cover sleeve connectivity through ideal wires and closed contacts, separate
     four-way series RETURN, pot endpoints, and preservation of existing estimate
     fields. See [grounded-terminal tests](src/circuit/groundedTerminals.test.ts).
   - **LC:** all six settings, ideal frequencies, missing signal/ground, unsupported
     taps, and input/output-side activity at volume endpoints.
   - **Files:** skin-family validation, dynamic terminals, strict v1 migration,
     unchanged earlier v2 objects, attributed round trips, rejected imports, undo, and persistence.
     Cover errors after closing Open, same-file retries, and cancellation of late
     import reads after closing the dialog or changing the circuit.
   - **Theme and history:** Light default, invalid preferences, restricted storage,
     theme persistence, and exact saved circuit data and undo history across theme
     and mode changes. See [theme unit tests](src/theme.test.ts).
   - **Ground view:** compact default, raw `shown`/`hidden` preferences at
     `pickup-lab:ground-wiring:v1`, invalid values, and restricted storage. Preserve
     circuit data, exports, undo history, routes, and tone/LC estimates and body
     effects across toggles. Cover wire-only permanent grounds separately from
     electrical ground through closed contacts, all four-way RETURN positions,
     split links, and shorted interconnects. See
     [presentation tests](src/components/groundPresentation.test.ts),
     [preference tests](src/groundWiring.test.ts), and
     [compact-ground browser tests](tests/compact-ground.spec.ts).
   - **Signal roles and flow:** stable HOT/RETURN colors across controls, wire-only
     role propagation, RETURN precedence on interpickup and humbucker series links,
     and permanent ground precedence. Cover outputward direction with reversed
     `from`/`to`, static ambiguous paths, inactive leads, volume endpoints, broken
     returns, disconnected outputs, shorts, and unavailable estimates. Preserve
     analyzer estimates. See [signal presentation tests](src/components/signalPresentation.test.ts).
   - **Wire geometry:** occupancy-aware lane separation, bounded crossing gaps,
     protected terminals, deterministic ordering, and nearest-visible picking with
     full-path fallback. Preserve geometry across controls, theme, and tracing;
     preserve connections, saved data, and part positions. See
     [geometry tests](src/components/wireGeometry.test.ts).
   - **Flags:** all [feature flags](README.md#feature-flags), including saved/imported
     extended circuits remaining readable and operable with extended authoring disabled.
4. Inspect visual and interaction changes in both Light and Dark:
   - Check label/focus contrast, wire colors and dash patterns, pickup skins,
     active coil rows, ground states, and separate tone/Varitone indications.
   - Check compact ground symbols beside wire-only sleeve-connected terminals.
     Four-way RETURN leads and switch commons stay visible in every position;
     split links stay visible in both push-pull states. **More** → **Show ground wiring**
     exposes original permanent ground feeds and junctions for selection and editing.
     Check grey return activity, floating/unknown junctions, warnings, reachable
     terminal centers, direct wiring to jack sleeve, and the mobile toggle.
     With signal flow enabled, permanent ground is grey, tone is teal, LC is purple,
     HOT is orange even when inactive, and RETURN is muted green even in active series.
     Traces retain role colors; tone/LC activity before ground retains its colors.
   - Check tone-style moving highlights on contributing HOT/RETURN paths toward
     the jack, including reversed saved endpoints and series returns. Volume zero
     stops output flow while input-side activity can remain; ambiguous paths and
     reduced motion stay static. Exercise both layouts independently of compact
     ground, and check previous activity-based colors with signal flow disabled.
     Treat motion as educational contribution; measured current requires a fuller
     model. See [signal-flow browser tests](tests/signal-flow.spec.ts).
   - Check transparent crossing gaps across every base and activity layer: signal,
     ground, tone, and LC. Traces stay continuous and pointer-inert above base wires.
     Check crossing/adjacent-lane picks, keyboard traces, and flag-off routing and
     outlines. See [clear-wiring browser tests](tests/clear-wiring.spec.ts).
   - Select parts to use contextual sliders, switch buttons, and Varitone settings.
     Check mouse/keyboard dragging in Edit, wiring-label visibility, and access to
     real terminals while controls are open. Slider changes preserve part positions.
   - Exercise Open, Add part, Diagram details, and Help. Check modal Tab containment,
     focus restoration, and Escape closing only the top layer while preserving an
     underlying trace or pending connection. Check warnings with dialogs closed.
   - Check mobile panning on empty canvas, reachable panel Close buttons, scrollable
     controls, reduced motion, source links, saved titles, and exports.
   - Use **Open** → **Library** for Standard Tele and each extended example,
     **New circuit**, and a restored legacy circuit; use **Undo** to return to prior work.
     Repeat baseline flows in the original layout with `VITE_ENABLE_WORKBENCH_UI=false`.
     See [default-workbench tests](tests/workbench-ui.spec.ts),
     [interaction regressions](tests/workbench-ui-interactions.spec.ts),
     [original-layout tests](tests/workbench.spec.ts), and
     [circuit regressions](src/circuit/extensions.test.ts).
5. Run `npm run check` before declaring the change ready. Report checks that
   could not run. Review the diff, update affected usage instructions, and
   verify identity before committing.

Use `npm run test` or `npm run test:browser` for focused feedback during editing;
the full check remains the readiness gate. `npm run format` applies formatting.
For routing changes, capture performance baselines before editing and compare
route calculation and dragging on presets and dense custom layouts. Preserve
geometry memoization and candidate/occupancy-work budgets in
[`Board.tsx`](src/components/Board.tsx) and [routing](src/components/wireRouting.ts).
Keep ports **4173–4177** free for the original-layout baseline and
**4178, 4179, 4181, 4182, 4184, 4186, 4187** for the default workbench and flag variants;
**4184** runs `VITE_ENABLE_CLEAR_WIRING=false`, **4186** runs
`VITE_ENABLE_COMPACT_GROUND=false`, and **4187** runs `VITE_ENABLE_SIGNAL_FLOW=false`.
The compact flag-off and original sidebar views show full grey ground wiring.
**4180** remains available for manual preview. The [browser configuration](playwright.config.ts)
runs both layouts in the full check. Preserve the existing circuit and fallback
coverage alongside new UI tests. See [package scripts](package.json) for the complete pipeline.

## Authoring diagrams

Use the [hardware reference](docs/hardware-reference.md) for logical connections
and manufacturer-specific physical checks. Follow the
[diagram format](docs/diagram-format.md) for exact terminal IDs, required fields,
limits, and a minimal JSON example. Preserve existing parts and settings during
migration; use **Open** → **Library** → **Standard Tele** → **Load example**, then
**Undo** to restore prior work. Every library entry uses the same editable
representation and undo history; export an example from Open as an authoring starting point.
Ground junctions require explicit paths to the jack sleeve.
Optional pot ratings describe nominal hardware values; keep the educational
linear estimate separate from hardware audio taper. Pickup skins describe generic
physical variants; verify manufacturer lead counts and colors for real hardware.
Keep ideal LC resonance and qualitative branch activity separate from loaded
frequency response and the broad tone indication.

Choose **Edit**, then **Open**, to record creator, source, and verified reuse
information in metadata. Permission comes from the rights holder; metadata carries
that record. Keep import and attribution changes validated before committing them to the workbench, and
preserve undo and saved data when an import fails.

## Repository map

- [`src/circuit/model.ts`](src/circuit/model.ts): parts, terminals, wires, limits,
  original preset, and blank build.
- [`src/circuit/validation.ts`](src/circuit/validation.ts): circuit data validation.
- [`src/circuit/portable.ts`](src/circuit/portable.ts): v1 migration and validated
  v2 JSON parsing/serialization.
- [`src/circuit/analyze.ts`](src/circuit/analyze.ts): pure connectivity and estimates.
  Derived `groundedTerminals` follows ideal wires and closed contacts to jack sleeve.
- [`src/circuit/coilNetwork.ts`](src/circuit/coilNetwork.ts): bounded coil-graph
  reduction, active coils, relative polarity, and whole-pickup topology.
- [`src/circuit/library.ts`](src/circuit/library.ts): original editable examples
  with reference-credit metadata.
- [`src/circuit/testFixtures.ts`](src/circuit/testFixtures.ts): preserved simplified
  selector and previous two-humbucker circuits for compatibility coverage.
- [`src/App.tsx`](src/App.tsx): shared circuit controller, editing, undo, save
  coordination, and original-layout fallback.
- [`src/components/WorkbenchLayout.tsx`](src/components/WorkbenchLayout.tsx):
  default diagram-first layout, contextual controls, dialogs, and status.
- [`src/components/PartControl.tsx`](src/components/PartControl.tsx): shared pot,
  selector, push-pull, and Varitone controls for both layouts.
- [`src/theme.ts`](src/theme.ts), [`src/workbench.css`](src/workbench.css): independent
  theme preference and Light/Dark workbench styling.
- [`src/groundWiring.ts`](src/groundWiring.ts): guarded, independent ground-view
  preference; [`src/groundWiring.test.ts`](src/groundWiring.test.ts) covers storage.
- [`src/components/Board.tsx`](src/components/Board.tsx): original SVG artwork,
  scaled terminals, coil and tone indications, and board interaction.
- [`src/components/groundPresentation.ts`](src/components/groundPresentation.ts):
  separate wire-only sleeve connectivity for markers and grey wires. Compact view
  hides explicit permanent ground feeds and connected ground parts; signal
  interconnects and jumpers stay inspectable even when shorted to sleeve.
  [`groundPresentation.test.ts`](src/components/groundPresentation.test.ts) covers
  physical display separately from the analyzer's electrical ground.
- [`src/components/signalPresentation.ts`](src/components/signalPresentation.ts):
  stable wire roles and outputward contribution directions. HOT/RETURN roles
  propagate through wire-only nets; unlabelled switch jumpers inherit their physical
  pole's role. RETURN takes precedence on interpickup and humbucker coil series links;
  permanent ground takes precedence throughout. Directions use analyzer-selected
  paths, with static highlights for ambiguous alternatives.
  [`signalPresentation.test.ts`](src/components/signalPresentation.test.ts) covers
  roles and directions; [`signal-flow.spec.ts`](tests/signal-flow.spec.ts) covers
  colors, motion, themes, volume, reduced motion, crossing cuts, and flag rollback.
- [`src/components/wireRouting.ts`](src/components/wireRouting.ts),
  [`src/components/wireGeometry.ts`](src/components/wireGeometry.ts): bounded routes,
  lane occupancy, crossing gaps, and visible-wire picking.
- [`src/components/ExtendedArtwork.tsx`](src/components/ExtendedArtwork.tsx): pickup
  skins and LC module artwork; [`PickupOptions.tsx`](src/components/PickupOptions.tsx):
  appearance and separate-cover-lead authoring; [`VaritoneCard.tsx`](src/components/VaritoneCard.tsx):
  ideal resonance and branch state.
- [`src/components/DiagramFiles.tsx`](src/components/DiagramFiles.tsx): local
  import/export and attribution editing.
- [`src/storage.ts`](src/storage.ts), [`src/flags.ts`](src/flags.ts): browser
  persistence and local feature gates.
- `src/**/*.test.ts`, [`tests/`](tests/): Vitest behavior tests and Playwright
  interactions.
  [`groundedTerminals.test.ts`](src/circuit/groundedTerminals.test.ts) covers derived
  connectivity and estimate preservation; [`compact-ground.spec.ts`](tests/compact-ground.spec.ts)
  covers visibility, editing, themes, persistence, exports, and layout/flag fallbacks.
- [`scripts/`](scripts/), [`.githooks/`](.githooks/): identity checks and commit hook.

## Boundaries

Keep runtime processing and saved work in the browser, dependencies small,
fixtures synthetic, and artwork original. Use reference diagrams to inform
correctness and author the editable circuit in the shared model. Ask before
adding servers, external runtime services, audio simulation, automatic image
recognition, or copied third-party artwork.

Keep changes inside this repository and Git settings repository-local. Follow
the coding and writing standards referenced in [AGENTS.md](AGENTS.md).
