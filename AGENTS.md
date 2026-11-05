# Guitar Wiring

## Purpose

A local-first, browser-only playground for understanding and experimenting with
passive guitar wiring. Prioritize a usable eval-build loop and small changes.

## Personal identity

Every commit author and committer must use:

- Name: `Tiago Caxias`
- Email: `12184375+tcaxias@users.noreply.github.com`

Verify repository-local Git configuration and resolved `git var GIT_AUTHOR_IDENT`
and `git var GIT_COMMITTER_IDENT` before committing. Stop on any mismatch.
Keep identity settings local to this repository. Preserve attribution trailers
added by tooling. The user permits choosing suitable work-oriented branch names.

## Stack and organization

- TypeScript, React, Vite; original SVG parts and wires.
- Pure circuit analysis lives separately from rendering and browser persistence.
- Vitest covers circuit behavior; Playwright covers user interactions.
- `README.md` documents startup, verification, and the current behavior.
- `CONTRIBUTING.md` documents the local contribution loop.

## Product constraints

- Runtime processing and saved work stay in the browser.
- Glow is an educational approximation of contribution to output.
- Show tone as a separate treble indication, distinct from volume attenuation.
- Ground/return connections have their own visual treatment.
- Unsupported arrangements get an explicit unavailable estimate.
- Presets and blank builds use the same editable circuit representation.
- Gate user-visible behavior through documented local feature flags.
- Use original artwork and authored presets; references inform correctness.

## Verification

Read `README.md`, `CONTRIBUTING.md`, and any CI configuration before changes.
Run the documented full verification command before declaring a change ready.
Cover switch positions, volume endpoints, broken grounds, shorts, disconnected
outputs, unsupported arrangements, persistence, and feature flags where relevant.
Inspect the browser after visual changes and report checks that could not run.
Keep tests deterministic and fixtures synthetic.

## Boundaries

Keep dependencies small. Ask before adding servers, external runtime services,
audio simulation, automatic image recognition, or copied third-party artwork.
Do not modify parent repositories, siblings, global Git settings, or secrets.
Use the coding and writing standards under `~/.config/opencode/standards/`.
Keep personal execution plans in `~/docs/plans/`.
