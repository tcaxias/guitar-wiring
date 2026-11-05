# Hardware authoring reference

Use these logical terminals to author editable parts and presets. Verify physical
lug order, viewing orientation, and wire colors against the exact manufacturer's
diagram before wiring hardware. Switch layouts vary by model; see the
[layout comparison](https://www.premierguitar.com/gear/mod-garage-how-to-wire-alternative-tele-3-way-switches).
Create original artwork and presets from the electrical relationships below.
For source images or PDFs, record creator credit, source, and verified reuse
information; reuse rights come from the rights holder's license or permission.

## Standard Tele-style starting circuit

Start with two single-coil pickups, a three-way two-pole blade, master volume,
master tone, and a mono output jack. Use the [blade wiring below](#three-way-blade-switch)
with the app's position convention: **1 neck, 2 both in parallel, 3 bridge**.

Common hardware values are **250 kΩ audio-taper pots** for volume and tone and
a **47 nF (0.047 µF) tone capacitor**, as described in
[Seymour Duncan's Telecaster guidance](https://seymourduncan.zendesk.com/hc/en-us/articles/31330817748887-What-Value-of-Volume-Pot-and-Tone-Pot-should-I-Use-in-my-Telecaster).
Values vary by pickup and player preference; check the chosen hardware's guidance.
Keep the hardware's audio taper distinct from the app's educational linear
control model.

## Signal ground

Use a signal-return junction wired to the output jack's sleeve. Connect pickup
returns, shields, and pot casings through their separate terminals and explicit
wires, following the [grounding explanation](https://www.seymourduncan.com/blog/latest-updates/guitar-wiring-102).
In this authoring convention, the three-bar ground symbol identifies app signal
ground, distinct from protective mains earth. Junctions connect only through
explicit wires; each ground junction needs a wired path to the sleeve.

## Reading wire crossings

Author a gap or bridge at a geometric crossing to show separate wires.
In this app, electrical connections follow explicit terminal endpoints and
component behavior; line intersections describe routing.
Even wires on the same net elsewhere remain locally separate at a crossing.
Reserve a join marker for an actual shared terminal. Trace the whole logical
wire between its two terminal endpoints, including across any visual gap.
For the crossing/junction distinction, see
[KiCad's wire-junction reference](https://docs.kicad.org/9.0/en/eeschema/eeschema.html#wire-junctions).

## Three-way blade switch

Conventional CRL/OakGrigsby three-way blades have two independent poles, each
with one common and three throws: eight signal lugs. Electroswitch lists the
[CRL E2G0203S and OakGrigsby 51992](https://www.electro-nc.com/electroswitch-switches-guitars)
as two-pole, three-position switches; this
[contact explanation](https://www.premierguitar.com/gear/mod-garage-how-to-wire-a-stock-tele-pickup-switch)
describes their eight lugs.

Name the logical terminals `AC`, `A1`, `A2`, `A3` and `BC`, `B1`, `B2`, `B3`.
`AC` and `BC` are the commons. Define settled positions as follows:

| Position | Pole A connection | Pole B connection |
| -------- | ----------------- | ----------------- |
| 1        | AC–A1             | BC–B1             |
| 2        | AC–A2             | BC–B2             |
| 3        | AC–A3             | BC–B3             |

For a neck/both/bridge preset, join both commons to the selector output, neck hot
to `A1` and `A2`, and bridge hot to `B2` and `B3`. Leave `A3` and `B1` open.
These external jumpers create the parallel-pickup middle position. The authoring
model covers settled contacts only; movement between positions remains a
hardware-specific detail.

## Four-way blade switch

A four-way two-pole blade has ten logical lugs: `AC`, `A1`–`A4`, and `BC`,
`B1`–`B4`. Each settled position connects both commons to their matching throws.
The table uses the app's **neck / parallel / bridge / series** convention;
physical position numbering follows the exact switch manufacturer's diagram.

| Position | Pole A connection | Pole B connection | Authored pickup selection |
| -------- | ----------------- | ----------------- | ------------------------- |
| 1        | AC–A1             | BC–B1             | Neck                      |
| 2        | AC–A2             | BC–B2             | Both in parallel          |
| 3        | AC–A3             | BC–B3             | Bridge                    |
| 4        | AC–A4             | BC–B4             | Both in series            |

For this original wiring arrangement, `S` is the signal bus feeding the master
controls, and `GND` has a wired path to the jack sleeve:

- Join neck hot, `A2`, and `A3` to `S`; bridge return to `GND`.
- Connect bridge hot to `AC` and neck return to `BC`.
- Join `B1` and `B2` to `GND`; join `A4` to `B4`; leave `A1` and `B3` open.
- Keep neck-cover `SHIELD` separately grounded while switching coil `RETURN`.

[StewMac's Oak Grigsby instructions](https://www.stewmac.com/video-and-ideas/online-resources/learn-about-guitar-pickups-and-electronics-and-wiring/oak-grigsby-4-way-2-pole-lever-switch-instructions/)
explain the separate neck-cover ground and use a bridge-first position order.

## Volume and tone pots

Define lug `2` as the wiper: at **0** it meets lug `1`; at **10** it meets lug `3`.
These are logical labels. Map them to the physical pot using its viewing
orientation. The following wiring follows the divider and variable-resistor
arrangements in [Seymour Duncan's Guitar Wiring 102](https://www.seymourduncan.com/blog/latest-updates/guitar-wiring-102).

| Control | Lug 1  | Lug 2 (wiper)          | Lug 3 | Endpoints         |
| ------- | ------ | ---------------------- | ----- | ----------------- |
| Volume  | Ground | Output                 | Input | 0 silent; 10 full |
| Tone    | Input  | Capacitor, then ground | Open  | 0 dark; 10 bright |

Represent the casing as a separate ground connection, electrically isolated
from the three lugs until explicitly wired. Connect casing and circuit ground
with authored wires.

## Pickup variants

Use distinct original silhouettes for the pickup families. Traditional **P90**
and **DynaSonic** designs are single-coil; **Filter'Tron** designs are humbucking,
as described in [Seymour Duncan's family comparison](https://www.seymourduncan.com/blog/latest-updates/gretsch-style-pickups-the-filtertron-vs-dynasonics-vs-p90s).
**Mini-humbuckers** also use a humbucking design. Each family has its own
construction and tonal character; shared logical terminals describe wiring.

A four-conductor version is a **generic educational variant**. Physical lead
counts and split capability require verification for the exact pickup: Seymour
Duncan's [Vintage Mini Humbucker](https://www.seymourduncan.com/single-product/vintage-mini-humbucker)
uses a single-conductor braided-shield cable. Choose logical coil endpoints
from the verified wiring diagram, independently of the artwork's appearance.

## Four-conductor humbucker

Use neutral coil endpoints `Astart`, `Afinish`, `Bstart`, and `Bfinish`, plus a
separate `shield`. Define the series connection as:

| Role        | Connection                    |
| ----------- | ----------------------------- |
| Hot         | Astart                        |
| Series link | Afinish–Bstart                |
| Return      | Bfinish                       |
| Shield      | Separate connection to ground |

These labels identify coil endpoints. Verify magnetic polarity, signal phase,
hum cancellation, and lead colors using the pickup manufacturer's instructions.
[DiMarzio's four-conductor guide](https://www.dimarzio.com/node/1751) gives a
manufacturer-specific series hookup and keeps the bare shield grounded when
reversing the signal leads.

## Push-pull coil split

A push-pull combines a three-lug pot and casing with an electrically independent
six-lug **DPDT** switch: two poles, each with a common and two throws. See
[Fralin's push-pull explanation](https://www.fralinpickups.com/2017/03/29/push-pull-pots-mods/).
Keep the [pot wiring](#volume-and-tone-pots) separate from these logical switch
contacts; verify their physical locations against the chosen hardware.

| State  | Pole A connection | Pole B connection |
| ------ | ----------------- | ----------------- |
| Pushed | Common–throw 1    | Common–throw 1    |
| Pulled | Common–throw 2    | Common–throw 2    |

For the [series humbucker convention](#four-conductor-humbucker), connect
`Afinish–Bstart` to one switch common, leave throw 1 open, and ground throw 2.
Pushed preserves both coils in series. Pulled grounds the series junction:
both ends of coil B reach ground because `Bfinish` is already grounded, leaving
coil A contributing. Wiring the junction to hot instead shorts coil A and leaves
coil B. Keep the shield grounded in either state.

**Splitting** selects one coil of a humbucker. **Tapping** selects an intermediate
point within a coil's winding; each requires its own suitable pickup leads.

## LC Varitone approximation

Represent the classic topology as a prewired two-terminal `SIGNAL` / `GROUND`
shunt module. The selected branch runs **signal → capacitor → 1.5 H choke →
ground**; position 1 opens that branch for bypass. The capacitances and choke
value follow [Premier Guitar's Varitone reference](https://www.premierguitar.com/pro-advice/mod-garage-varitone-wiring-reloaded-and-extended).

| Position | Selected capacitance | Ideal LC resonance |
| -------- | -------------------- | ------------------ |
| 1        | Bypass: branch open  | —                  |
| 2        | 1 nF                 | 4109 Hz            |
| 3        | 3 nF                 | 2373 Hz            |
| 4        | 10 nF                | 1299 Hz            |
| 5        | 30 nF                | 750 Hz             |
| 6        | 220 nF               | 277 Hz             |

These rounded reference frequencies use `f = 1 / (2π√(LC))`, with `L` in henries
and `C` in farads. The approximation covers the LC shunt topology and its ideal
resonance. Loaded response, notch depth, bandwidth, and actual Gibson notch
frequencies require a fuller circuit model with pickup, control, and output
loading. Historical circuits can also include a 100 kΩ series resistor and
10 MΩ anti-pop resistors, described in the same reference; their effects require
that fuller model. Keep the LC indication separate from the tone control's broad
treble percentage.

## Educational indicators

Author glow to illustrate connected contribution to output. Show relative treble
diverted through the tone branch separately from volume attenuation, following
the [project's visual conventions](../AGENTS.md#product-constraints).
Treat both as qualitative teaching aids. Ideal LC resonance supplies a separate
reference frequency; numerical voltage, current, and loaded frequency response
require a circuit simulation.
