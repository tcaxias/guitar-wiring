import {
  switchConnections,
  terminalId,
  terminalsFor,
  potRole,
  isBladePart,
  varitoneSetting,
  type Circuit,
  type Part,
} from './model';
import { isCircuit } from './validation';
import {
  reduceCoilNetwork,
  type CoilEdge,
  type PickupTopology,
} from './coilNetwork';

export interface Estimate {
  status: 'live' | 'silent' | 'unavailable';
  message: string;
  activePickups: string[];
  activeCoils: Record<string, ('a' | 'b')[]>;
  output: number | null;
  treble: number | null;
  wireLevels: Record<string, number>;
  groundWires: string[];
  groundedTerminals: string[];
  groundWireLevels: Record<string, number>;
  groundNodes: Record<
    string,
    { isConnected: boolean | null; isActive: boolean }
  >;
  toneWires: string[];
  toneDiversion: number | null;
  toneWireLevels: Record<string, number>;
  capacitorLevels: Record<string, number>;
  notes: string[];
  pickupTopology: PickupTopology;
  varitone: null | {
    partId: string;
    position: number;
    isBypassed: boolean;
    isConnected: boolean;
    frequencyHz: number | null;
    capacitanceNanofarads: number | null;
    level: number;
  };
  varitoneWireLevels: Record<string, number>;
}

type Edge = { to: string; wire?: string };

export function analyze(circuit: Circuit): Estimate {
  const result: Estimate = {
    status: 'silent',
    message: 'Add a pickup and an output jack to begin.',
    activePickups: [],
    activeCoils: {},
    output: 0,
    treble: null,
    wireLevels: {},
    groundWires: [],
    groundedTerminals: [],
    groundWireLevels: {},
    groundNodes: {},
    toneWires: [],
    toneDiversion: 0,
    toneWireLevels: {},
    capacitorLevels: {},
    notes: [],
    pickupTopology: null,
    varitone: null,
    varitoneWireLevels: {},
  };
  const unavailable = (reason: string): Estimate => ({
    ...result,
    status: 'unavailable',
    message: `Connections shown; signal estimate unavailable. ${reason}`,
    output: null,
    treble: null,
    activePickups: [],
    activeCoils: {},
    wireLevels: {},
    groundWireLevels: {},
    groundNodes: Object.fromEntries(
      Object.entries(result.groundNodes).map(([id, state]) => [
        id,
        { ...state, isActive: false },
      ]),
    ),
    toneDiversion: null,
    toneWireLevels: {},
    capacitorLevels: {},
    toneWires: [],
    pickupTopology: null,
    varitone: result.varitone ? { ...result.varitone, level: 0 } : null,
    varitoneWireLevels: {},
  });
  if (!isCircuit(circuit))
    return unavailable('Circuit data is invalid or exceeds workbench limits.');
  const byKind = (kind: Part['kind']) =>
    circuit.parts.filter((part) => part.kind === kind);
  const pickups = circuit.parts.filter(
    (part) => part.kind === 'pickup' || part.kind === 'humbucker',
  );
  const jacks = byKind('jack');
  const jack = jacks[0];
  for (const part of byKind('ground'))
    result.groundNodes[part.id] = {
      isConnected: jacks.length > 1 ? null : false,
      isActive: false,
    };
  if (!jack) return result;

  const graph = new Map<string, Edge[]>();
  for (const part of circuit.parts)
    for (const terminal of terminalsFor(part))
      graph.set(terminalId(part, terminal.name), []);
  const join = (from: string, to: string, wire?: string) => {
    graph.get(from)!.push({ to, wire });
    graph.get(to)!.push({ to: from, wire });
  };
  for (const wire of circuit.wires) join(wire.from, wire.to, wire.id);
  const selector = byKind('selector')[0];
  for (const part of circuit.parts)
    for (const [from, to] of switchConnections(part)) join(from, to);

  // Only ideal wires and closed switch contacts form nets. Pots and capacitors
  // are classified below, so ground can never become a signal traversal edge.
  const nets = new Map<string, number>();
  for (const terminal of graph.keys()) {
    if (nets.has(terminal)) continue;
    const net = nets.size;
    const queue = [terminal];
    nets.set(terminal, net);
    for (let index = 0; index < queue.length; index++) {
      for (const edge of graph.get(queue[index]!)!)
        if (!nets.has(edge.to)) {
          nets.set(edge.to, net);
          queue.push(edge.to);
        }
    }
  }
  const same = (left: string, right: string) =>
    nets.get(left) === nets.get(right);
  const tip = terminalId(jack, 'tip');
  const ground = terminalId(jack, 'sleeve');
  if (jacks.length === 1)
    result.groundedTerminals = [...graph.keys()].filter((id) =>
      same(id, ground),
    );
  result.groundWires = circuit.wires
    .filter((wire) => same(wire.from, ground))
    .map((wire) => wire.id);
  if (jacks.length === 1)
    for (const part of byKind('ground'))
      result.groundNodes[part.id]!.isConnected = same(
        terminalId(part, 'common'),
        ground,
      );
  if (
    jacks.length > 1 ||
    circuit.parts.filter((part) => potRole(part) === 'volume').length > 1 ||
    circuit.parts.filter((part) => potRole(part) === 'tone').length > 1 ||
    byKind('capacitor').length > 1 ||
    byKind('selector').length + circuit.parts.filter(isBladePart).length > 1
  ) {
    if (jacks.length > 1) result.groundWires = [];
    return unavailable(
      'Use one output, one master volume, and one tone branch.',
    );
  }
  if (byKind('varitone').length > 1)
    return unavailable('Use at most one Varitone module.');
  if (same(tip, ground))
    return { ...result, message: 'Output shorted to ground.' };

  const volume = circuit.parts.find((part) => potRole(part) === 'volume');
  const source = volume ? terminalId(volume, 'input') : tip;
  const varitone = byKind('varitone')[0];
  if (varitone) {
    const setting = varitoneSetting(varitone);
    const signal = terminalId(varitone, 'signal');
    const isConnected =
      (same(signal, source) || same(signal, tip)) &&
      same(terminalId(varitone, 'ground'), ground);
    result.varitone = {
      partId: varitone.id,
      position: setting.position,
      isBypassed: setting.position === 1,
      isConnected,
      frequencyHz: setting.frequencyHz,
      capacitanceNanofarads: setting.capacitanceNanofarads,
      level: 0,
    };
    if (!isConnected)
      result.notes.push(
        'Varitone branch disconnected or on an unsupported tap; no filter activity estimated.',
      );
  }
  if (!pickups.length) return result;
  if (volume) {
    if (!same(terminalId(volume, 'wiper'), tip))
      return {
        ...result,
        message: 'Output disconnected. Connect volume OUT to jack TIP.',
      };
    if (!same(terminalId(volume, 'ground'), ground))
      return unavailable(
        'The volume ground needs a return to the jack sleeve.',
      );
    if (same(source, ground))
      return { ...result, message: 'Pickup signal shorted to ground.' };
    if (same(source, tip))
      return unavailable('The volume input and output are bypassed.');
  }

  const tone = circuit.parts.find((part) => potRole(part) === 'tone');
  const capacitor = byKind('capacitor')[0];
  let toneCapInput: string | undefined;
  let toneCapReturn: string | undefined;
  if (tone || capacitor) {
    if (!tone || !capacitor)
      return unavailable(
        'Use a tone control with a series capacitor to ground.',
      );
    const toneInput = terminalId(tone, 'input');
    const toneWiper = terminalId(tone, 'wiper');
    const capA = terminalId(capacitor, 'a');
    const capB = terminalId(capacitor, 'b');
    if (graph.get(terminalId(tone, 'unused'))!.length)
      return unavailable('Tone lug 3 must remain unused in this estimate.');
    const isCapConnected =
      (same(toneWiper, capA) && same(capB, ground)) ||
      (same(toneWiper, capB) && same(capA, ground));
    if (
      !same(toneInput, source) ||
      !isCapConnected ||
      same(toneWiper, source) ||
      same(toneWiper, ground)
    )
      return unavailable(
        'Use the master tone input on the pickup bus, then CAP through the capacitor to ground.',
      );
    result.treble = Math.round(25 + tone.value * 7.5);
    toneCapInput = same(toneWiper, capA) ? capA : capB;
    toneCapReturn = toneCapInput === capA ? capB : capA;
  } else result.treble = 100;

  if (selector && !same(terminalId(selector, 'common'), source))
    return unavailable('Connect selector OUT to the master input.');
  const coils: CoilEdge[] = [];
  for (const pickup of pickups) {
    const isHumbucker = pickup.kind === 'humbucker';
    if (isHumbucker || pickup.hasSeparateShield) {
      const shield = terminalId(pickup, 'shield');
      if (graph.get(shield)!.length && !same(shield, ground))
        return unavailable(
          'Pickup shields must be separate from signal leads and connect to ground.',
        );
      if (!graph.get(shield)!.length)
        result.notes.push(`${pickup.label}: separate shield is not grounded.`);
    }
    const definitions = isHumbucker
      ? [
          ['a-start', 'a-finish', 'a'],
          ['b-start', 'b-finish', 'b'],
        ]
      : [['hot', 'return']];
    for (const [start, finish, coil] of definitions) {
      const hot = terminalId(pickup, start!);
      const pickupReturn = terminalId(pickup, finish!);
      if (volume && [hot, pickupReturn].some((terminal) => same(terminal, tip)))
        return unavailable('A pickup bypasses the master volume.');
      if (
        tone &&
        [hot, pickupReturn].some((terminal) =>
          same(terminal, terminalId(tone, 'wiper')),
        )
      )
        return unavailable('A pickup is connected inside the tone branch.');
      coils.push({
        pickupId: pickup.id,
        coil: coil as 'a' | 'b' | undefined,
        hot,
        return: pickupReturn,
        from: nets.get(hot)!,
        to: nets.get(pickupReturn)!,
      });
    }
  }
  const network = reduceCoilNetwork(
    coils,
    nets.get(source)!,
    nets.get(ground)!,
  );
  if (network.reason) return unavailable(network.reason);
  result.pickupTopology = network.topology;
  for (const pickup of pickups) {
    const active = network.active.filter((coil) => coil.pickupId === pickup.id);
    if (active.length) {
      result.activePickups.push(pickup.id);
      if (pickup.kind === 'humbucker')
        result.activeCoils[pickup.id] = (['a', 'b'] as const).filter((id) =>
          active.some((coil) => coil.coil === id),
        );
    } else if (
      coils.some(
        (coil) => coil.pickupId === pickup.id && same(coil.hot, source),
      )
    )
      result.notes.push(
        coils
          .filter((coil) => coil.pickupId === pickup.id)
          .every((coil) => coil.from === coil.to)
          ? `${pickup.label}: coils bypassed; no contribution.`
          : `${pickup.label}: floating return; no contribution.`,
      );
  }

  // Mark actual source-to-sink paths, not every branch of an energized net.
  // A breadth-first walk is bounded by the validated terminal/wire limits.
  const markPath = (
    from: string,
    to: string,
    level: number,
    levels = result.wireLevels,
    allowGround = false,
  ) => {
    const previous = new Map<string, { from: string; wire?: string }>();
    const queue = [from];
    const seen = new Set([from]);
    for (let index = 0; index < queue.length && !seen.has(to); index++) {
      for (const edge of graph.get(queue[index]!)!) {
        if (seen.has(edge.to) || (!allowGround && same(edge.to, ground)))
          continue;
        seen.add(edge.to);
        previous.set(edge.to, { from: queue[index]!, wire: edge.wire });
        queue.push(edge.to);
      }
    }
    if (!seen.has(to)) return;
    let current = to;
    const markGroundNode = (terminal: string) => {
      const state = result.groundNodes[terminal.split(':')[0]!];
      if (allowGround && level > 0 && state?.isConnected) state.isActive = true;
    };
    markGroundNode(current);
    while (previous.has(current)) {
      const step = previous.get(current)!;
      if (step.wire)
        levels[step.wire] = Math.max(levels[step.wire] ?? 0, level);
      current = step.from;
      markGroundNode(current);
    }
  };
  if (!result.activePickups.length)
    return { ...result, message: 'No complete pickup path to the output.' };
  const activeTerminals = new Map<number, string[]>();
  for (const coil of network.active)
    for (const terminal of [coil.hot, coil.return]) {
      const net = nets.get(terminal)!;
      activeTerminals.set(net, [...(activeTerminals.get(net) ?? []), terminal]);
    }
  for (const [net, endpoints] of activeTerminals) {
    const isGround = net === nets.get(ground);
    const anchor = isGround
      ? ground
      : net === nets.get(source)
        ? source
        : endpoints[0]!;
    for (const endpoint of endpoints)
      markPath(
        endpoint,
        anchor,
        1,
        isGround ? result.groundWireLevels : result.wireLevels,
        isGround,
      );
  }
  // Return activity means a connected path, not modeled current or amplitude.
  if (volume)
    markPath(
      terminalId(volume, 'ground'),
      ground,
      1,
      result.groundWireLevels,
      true,
    );
  if (tone && capacitor && toneCapInput && toneCapReturn) {
    // Relative activity, not simulated current: an input-side tone feed remains
    // active at master volume zero. Capacitance is stored, not modeled here.
    const level = (10 - tone.value) / 10;
    result.toneDiversion = Math.round(level * 100);
    result.capacitorLevels[capacitor.id] = level;
    markPath(source, terminalId(tone, 'input'), level, result.toneWireLevels);
    markPath(
      terminalId(tone, 'wiper'),
      toneCapInput,
      level,
      result.toneWireLevels,
    );
    markPath(toneCapReturn, ground, level, result.toneWireLevels, true);
    if (level > 0)
      markPath(toneCapReturn, ground, 1, result.groundWireLevels, true);
    result.toneWires = Object.keys(result.toneWireLevels);
  }
  result.output = volume ? volume.value * 10 : 100;
  if (varitone && result.varitone?.isConnected && !result.varitone.isBypassed) {
    // This is a separate qualitative LC shunt indication, not a DC short or a
    // vintage response model (loading, anti-pop and main-path resistors omitted).
    const signal = terminalId(varitone, 'signal');
    const isInputSide = same(signal, source);
    const level = isInputSide ? 1 : result.output / 100;
    result.varitone.level = level;
    if (level > 0) {
      markPath(
        isInputSide ? source : tip,
        signal,
        level,
        result.varitoneWireLevels,
      );
      markPath(
        terminalId(varitone, 'ground'),
        ground,
        level,
        result.varitoneWireLevels,
        true,
      );
      markPath(
        terminalId(varitone, 'ground'),
        ground,
        1,
        result.groundWireLevels,
        true,
      );
    }
  }
  if (volume) markPath(terminalId(volume, 'wiper'), tip, result.output / 100);
  result.status = result.output > 0 ? 'live' : 'silent';
  result.message =
    result.output > 0
      ? 'Signal reaches the output.'
      : 'Volume at zero. Output muted; pickups still feed the input.';
  return result;
}
