# Pickup Lab

A local-first playground for exploring passive guitar wiring. Change a control,
follow the signal, then edit the circuit. Built with React, TypeScript, and Vite;
circuit processing and saved work stay in your browser.

## Live sites

- **GitHub Pages:** <https://tcaxias.github.io/guitar-wiring/>
- **Cloudflare Pages:** <https://pickup-lab.pages.dev>

Both deploy automatically on every push to `main` via GitHub Actions.

## Start

Use Node **26.13.0** ([`.node-version`](.node-version)) and npm **11.20.x**
([`package.json`](package.json)). From this directory:

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open the loopback address printed by Vite, normally
<http://127.0.0.1:5173>. Keep the same address and port to restore saved work.

## Try it

The default [workbench](src/components/WorkbenchLayout.tsx) puts the diagram first.
The toolbar has **Open**, **Edit / Done**, **Undo**, a native **Theme** selector
(**Light / Dark**), and **More**. Light is the default; both themes use flat surfaces
and preserve wiring color roles and dash patterns.
**More** contains **Diagram details**, **Help**, **Show wiring labels**, and
**Show ground wiring**.

1. Start with **2 single-coils, 3-way blade, 1 volume, 1 tone**: 250 kΩ pots,
   a 47 nF capacitor, and an explicit ground wired to the jack sleeve. The default
   compact view replaces permanent ground feeds and the connected ground junction
   with small grey symbols beside terminals connected to sleeve through wires alone.
   Saved circuits restore their own wiring.
2. In Explore, click a part to open its controls. Select the blade, then use
   **Position 1 / 2 / 3** for neck / parallel / bridge. Select volume or tone,
   then adjust its slider: lower volume dims output; lower tone warms the treble.
   Knob values change through these controls; dragging artwork in Edit moves parts.
3. **Open** → **Library** → **Load example** loads an editable circuit and closes
   the dialog. **Undo** restores your previous build.

| Library entry        | Select its part, then try                                                    |
| -------------------- | ---------------------------------------------------------------------------- |
| Standard Tele        | The default three-way circuit                                                |
| Push-pull coil split | **Pushed** uses both coils; **Pulled** leaves each pickup's A row active     |
| 4-way Tele           | **Position 1–4**: neck, parallel, bridge, series; neck cover stays grounded  |
| LC Varitone Tele     | **Varitone position**: 1 bypass; 2–6 select five ideal LC notch-band markers |

Push-pull buttons change DPDT contact connections independently of knob rotation;
wires determine the split. Four-way neck-cover **SHIELD** stays separate from **RETURN**. See the
[library](src/circuit/library.ts) and [hardware reference](docs/hardware-reference.md).

4. Choose **Edit**, or **Open** → **New circuit** to start empty in Edit.
   **Add part** opens the palette dialog: choose a part to add it and close the dialog.
   Pickup choices include **Single coil**, **P90**, **DynaSonic**, **Humbucker**,
   **Filter'Tron**, and **Mini-humbucker**. Select a pickup to change
   **Pickup appearance**; single coils also offer
   **Add separate cover lead**. Humbucking variants use a generic four-conductor
   model plus shield; actual lead counts and split capability need manufacturer verification.
5. Click two terminals to wire them. Drag parts, or focus a part and use arrow keys.
   Select a part or wire and choose **Remove selected**. **Undo** retains 30 changes
   per tab, including library loads, imports, and new circuits. **Done** returns to Explore.

**More** → **Show ground wiring** reveals all original ground wires and connected
ground junctions for inspection, selection, and editing. Visible terminals, including
grounded pins and jack **SLEEVE**, remain available for wiring in compact view.
Floating, switch-routed, or unknown ground junctions and circuit warnings stay visible.
The four-way neck **RETURN** lead and switch common stay visible in all four positions,
including neck and parallel, where the switch electrically connects them to ground.
See the [physical ground display](src/components/groundPresentation.ts).

Hover or Tab to a wire to trace its endpoints; click or Enter pins the trace.
Escape or blank-board click clears it. In Edit, pinning also selects the wire for removal.
All terminal labels appear in Edit; Explore shows selected-part and traced-endpoint
labels. **More** → **Show wiring labels** shows them all.

Wires use thin lines and separated lanes. Small transparent gaps at crossings
show separate wires; wire edges connect only at actual terminals. The highlighted
trace stays continuous across gaps and lets pointer input reach the wires beneath it.
Pointer selection favors the nearest visible wire, with the full path as fallback.
This [presentation](src/components/Board.tsx) preserves electrical connections,
saved data, and part positions. Routing is bounded and best-effort; crowded or
overlapping custom layouts can retain overlaps. See the
[crossing convention](docs/hardware-reference.md#reading-wire-crossings).

Tab then Enter/Space selects a part and focuses its controls. **Close** or Escape
returns focus to the part. Escape closes the top dialog or menu first, then cancels
pending wiring or closes part controls. On mobile, swipe empty canvas space to pan;
part controls open in a closable panel near the top or bottom. **More** → **Help**
lists these interactions. Reduced-motion preferences keep signal, tone, and Varitone
activity static.

## Reading the estimate

The status bar shows output, contributing pickups, and single/parallel/series/mixed
connections. It keeps circuit warnings and save/file errors visible with dialogs closed.
**More** → **Diagram details** contains treble character, tone diversion, Varitone,
the legend, and approximation notes. The [analyzer](src/circuit/analyze.ts) follows
single coils, split humbuckers, and reducible series/parallel networks; a humbucker's
internal coils count as one pickup.

- **Orange HOT:** signal leads keep their color through control changes, including
  inactive pickup leads and the output at zero volume.
- **Muted green RETURN:** switched returns and series links stay muted green, including the active
  four-way series return and humbucker coil links. Permanent sleeve connections use grey.
- **Moving highlights:** active HOT and RETURN paths use tone-style highlights toward
  the jack, independent of saved wire endpoint order. Ambiguous alternate paths and
  reduced-motion preferences use static highlights. Volume uses a linear 0–100%
  teaching scale: zero stops output flow while input-side activity can remain.
- **Grey symbols / dashed grey wires:** permanent connections to jack sleeve through
  wires alone. Symbols appear in compact view; expanded permanent ground wiring
  uses grey throughout, including animated return segments.
  Shield/casing-only branches stay static. Voltage and current require a fuller model.
- **Teal:** tone → capacitor; ground returns stay grey. Treble is illustrative 25–100%; diversion
  is 0–100%. Pot ratings and tone-cap values are nominal, separate from audio taper.
- **Purple Varitone:** a separate **Notch band · illustrative** card and qualitative wire
  activity. Its 1.5 H LC branch has bypass plus five ideal resonance references;
  broad tone percentage stays separate. Loaded response, notch depth, bandwidth,
  voltage, current, and sound require a fuller model. See the
  [LC approximation](docs/hardware-reference.md#lc-varitone-approximation).
- **Estimate unavailable:** unsupported wiring, including irreducible bridges, conflicting
  coil polarity, extra master controls, or volume bypasses. Disconnections and
  shorts receive explanatory messages. Use one mono output, at most one selector,
  one master volume, one tone/capacitor branch, and one Varitone module.

Colors show wire roles; glow and motion show educational contribution estimates.
Measured current requires a fuller model. Tone and LC wires before ground retain
their colors. Compact and expanded views preserve estimates, capacitor/Varitone
body effects, and the existing pot model.
The [analyzer's electrical ground](src/circuit/analyze.ts) follows ideal wires and
closed contacts. The separate [physical display](src/components/groundPresentation.ts)
uses wire-only sleeve connectivity. The [signal presentation](src/components/signalPresentation.ts)
keeps HOT/RETURN roles stable and traces in their role colors. Signal roles and motion
apply in both layouts, independently of compact ground. See
[rendering](src/components/Board.tsx) and [theme colors](src/workbench.css).

## Saved work and format

Changes save to `pickup-lab:circuit:v2`, scoped to browser profile and origin.
Valid v1 data migrates when v2 is absent, retaining v1; earlier v2 fields stay intact.
Clearing site data clears saved work. Save failures and corrupt data have [recovery handling](src/storage.ts).

**Open** contains **Export JSON**, **Import JSON**, and attribution. Import works
in Explore and Edit with the editor and file flags enabled; validation precedes
replacement, the dialog closes on success, and **Undo** restores the previous diagram.
Closing the dialog cancels a pending file read. To edit metadata, choose **Edit**
first, then **Open**: set **Diagram title**, **Creator**, **Source URL**, and
**Permission / license**, then **Save attribution**. The title labels the board and
names the export. In Explore, Open shows creator, reuse information, and a **Source**
link when supplied. Reference-based library examples carry these credits through
export; reuse rights come from the rights holder.

The [theme preference](src/theme.ts) saves separately at `pickup-lab:theme:v1`.
The [ground-view preference](src/groundWiring.ts) uses `pickup-lab:ground-wiring:v1`,
with raw values `shown` or `hidden`; missing, invalid, or unreadable values default
to compact. Both preferences are scoped to browser profile and origin. Theme,
ground-view, and mode changes preserve circuit data, exports, and undo history.

Start authoring from an exported example or the minimal JSON in the
[v2 format guide](docs/diagram-format.md): exact fields, dynamic terminals,
compatibility rules, and **24 parts / 80 wires** limits. See [file handling](src/components/DiagramFiles.tsx).
The [backlog](docs/backlog.md) tracks diagram collection awaiting source PDFs and images.

## Feature flags

All [flags](src/flags.ts) default to enabled. Set the exact value `false` to disable:

- `VITE_ENABLE_PLAYGROUND=false`: shows the disabled page.
- `VITE_ENABLE_EDITOR=false`: hides editing, blank builds, import, and attribution
  editing; keeps Explore controls, example loading, and export.
- `VITE_ENABLE_DIAGRAM_FILES=false`: hides file and attribution controls; Open keeps
  example loading and New circuit when their flags allow them.
- `VITE_ENABLE_EXTENDED_PARTS=false`: hides Library, extended palette entries, and
  pickup appearance/cover-lead authoring. Saved and imported extended circuits stay
  readable and operable; import remains governed by the editor and file flags.
- `VITE_ENABLE_WORKBENCH_UI=false`: uses the original sidebar layout with
  **Play / Edit**, **Preset**, **Blank build**, and **Diagram & attribution**.
  Ground wiring is always fully shown in grey. Both layouts share circuit data,
  controls, and undo handling.
- `VITE_ENABLE_CLEAR_WIRING=false`: restores previous wire routing and outlines.
  Enabled by default as `isClearWiringEnabled`, this flag controls lane separation,
  crossing gaps, the continuous trace overlay, and visible-wire picking in both layouts.
- `VITE_ENABLE_COMPACT_GROUND=false`: always shows full grey ground wiring and hides
  **Show ground wiring**. Enabled by default as `isCompactGroundEnabled`, this flag
  allows compact ground presentation in the workbench.
- `VITE_ENABLE_SIGNAL_FLOW=false`: restores previous activity-based wire colors and
  removes HOT/RETURN moving highlights. Enabled by default as `isSignalFlowEnabled`,
  this flag controls stable role colors and outputward highlights in both layouts,
  independently of compact ground. Tone and LC activity retain their existing behavior.

For example: `VITE_ENABLE_EDITOR=false npm run dev`. Restart the dev server after
changing flags; rebuild production assets for build-time changes.

## Verification

Set up the personal Git identity in [CONTRIBUTING.md](CONTRIBUTING.md), then run:

```sh
npm run check
```

This runs identity verification, formatting, lint, identity-script tests, Vitest,
TypeScript checking and production build, then Playwright. Browser tests start
their own loopback servers: **4173–4177** for the original-layout regression baseline,
and **4178, 4179, 4181, 4182, 4184, 4186, 4187** for the default workbench and its flag variants
(**4184** tests clear wiring disabled; **4186** tests compact ground disabled;
**4187** tests signal flow disabled).
Keep those ports free; **4180** remains available for manual preview.
See [`package.json`](package.json) and [`playwright.config.ts`](playwright.config.ts).

## Deployment and live sites

The playground is available live at two mirrors:

- **GitHub Pages:** <https://tcaxias.github.io/guitar-wiring/>
- **Cloudflare Pages:** <https://pickup-lab.pages.dev>

### Continuous Deployment (CD)

Every push to `main` triggers GitHub Actions (`.github/workflows/ci.yml`), which
runs the full verification suite (`npm run check`) and deploys:

1. **GitHub Pages (automatic):** Deploys built assets on every push to `main` using
   GitHub Actions Pages deployment.
2. **Cloudflare Pages (automatic or manual):**
   - **Automatic in CI:** Runs on push to `main` when `CLOUDFLARE_API_TOKEN` and
     `CLOUDFLARE_ACCOUNT_ID` are configured in GitHub repository secrets.
   - **Manual CLI deploy:** Run `npm run deploy` locally anytime to build, verify,
     and upload directly to Cloudflare Pages via Wrangler.

### Manual Cloudflare deployment

After [setup](#start), authenticate through Wrangler's browser OAuth flow when needed:

```sh
npx wrangler login
```

Wrangler keeps authentication credentials outside the repository. Choose a deploy:

```sh
npm run deploy          # Production: main
npm run deploy:preview  # Preview: preview.pickup-lab.pages.dev
```

Both [scripts](package.json) run the full `npm run check`, including the build,
then upload only built static assets from `dist/` ([configuration](wrangler.jsonc)).
They build the current working tree; `--commit-dirty=true` acknowledges uncommitted
changes. Uploads are independent of Git remotes and pushes.

Saved circuits stay in the browser, separately for each origin. Use **Export JSON**
and **Import JSON** to transfer saved work between environments.

## License

Dual-licensed under either:

- MIT License ([`LICENSE-MIT`](LICENSE-MIT))
- Apache License, Version 2.0 ([`LICENSE-APACHE-2.0`](LICENSE-APACHE-2.0))

at your option. SPDX identifier: `(MIT OR Apache-2.0)`.
