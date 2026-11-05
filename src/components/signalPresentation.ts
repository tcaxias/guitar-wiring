import type { Estimate } from '../circuit/analyze';
import {
  isBladePart,
  isPushPullPart,
  potRole,
  switchConnections,
  terminalId,
  terminalsFor,
  type Circuit,
} from '../circuit/model';
import { isCircuit } from '../circuit/validation';
import { groundPresentation } from './groundPresentation';

export type WireRole = 'hot' | 'return' | 'ground' | 'tone' | 'lc' | 'unknown';
export type FlowDirection = 'forward' | 'reverse' | 'static';
type Edge = { to: string; wire?: string };

export const wireRoleColors: Record<WireRole, string> = {
  hot: 'var(--wire-signal, #f2b95f)',
  return: 'var(--wire-pickup, #5c7a3d)',
  ground: 'var(--wire-ground, #999999)',
  tone: 'var(--wire-tone, #8dbdb8)',
  lc: 'var(--wire-lc, #c5a6f2)',
  unknown: 'var(--wire-inactive, #647075)',
};

// Presentation only: neither control state nor contribution defines a lead's role.
export function signalWireRoles(circuit: Circuit): Record<string, WireRole> {
  if (!isCircuit(circuit)) return {};
  const graph = new Map<string, Edge[]>();
  const seeds = new Map<string, 'hot' | 'return'>();
  const filters = new Map<string, 'tone' | 'lc'>();
  const switchTerminals = new Set<string>();
  for (const part of circuit.parts)
    for (const terminal of terminalsFor(part)) {
      const id = terminalId(part, terminal.name);
      graph.set(id, []);
      if (
        isBladePart(part) ||
        part.kind === 'selector' ||
        (isPushPullPart(part) && terminal.name.startsWith('switch-'))
      )
        switchTerminals.add(id);
      if (
        ((part.kind === 'pickup' || part.kind === 'humbucker') &&
          ['hot', 'a-start', 'b-start'].includes(terminal.name)) ||
        (potRole(part) === 'volume' &&
          ['input', 'wiper'].includes(terminal.name)) ||
        (part.kind === 'jack' && terminal.name === 'tip')
      )
        seeds.set(id, 'hot');
      if (
        (part.kind === 'pickup' || part.kind === 'humbucker') &&
        ['return', 'a-finish', 'b-finish'].includes(terminal.name)
      )
        seeds.set(id, 'return');
      if (
        (potRole(part) === 'tone' &&
          ['input', 'wiper'].includes(terminal.name)) ||
        part.kind === 'capacitor'
      )
        filters.set(id, 'tone');
      if (part.kind === 'varitone' && terminal.name === 'signal')
        filters.set(id, 'lc');
    }
  for (const wire of circuit.wires) {
    graph.get(wire.from)!.push({ to: wire.to, wire: wire.id });
    graph.get(wire.to)!.push({ to: wire.from, wire: wire.id });
  }
  const nets = new Map<string, number>();
  const roles = new Map<number, 'hot' | 'return'>();
  for (const terminal of graph.keys()) {
    if (nets.has(terminal)) continue;
    const net = nets.size;
    const queue = [terminal];
    nets.set(terminal, net);
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]!;
      const role = seeds.get(current);
      // A wire-only series link touches both a HOT and a RETURN. RETURN wins,
      // including four-conductor coil links; no traversal crosses a coil.
      if (role && roles.get(net) !== 'return') roles.set(net, role);
      for (const edge of graph.get(current)!)
        if (!nets.has(edge.to)) {
          nets.set(edge.to, net);
          queue.push(edge.to);
        }
    }
  }
  // Only infer otherwise unlabelled throw/jumper nets from their physical pole.
  // Never close contacts here: that would turn HOT orange into RETURN muted green as
  // the switch moves, and could spread a ground/return role across the circuit.
  const inferred = new Map<number, 'hot' | 'return'>();
  for (const part of circuit.parts) {
    if (!isBladePart(part) && !isPushPullPart(part)) continue;
    const prefix = isPushPullPart(part) ? 'switch-' : '';
    for (const pole of ['a', 'b']) {
      const role = roles.get(
        nets.get(terminalId(part, `${prefix}${pole}-common`))!,
      );
      if (!role) continue;
      for (const terminal of terminalsFor(part)) {
        if (!terminal.name.startsWith(`${prefix}${pole}`)) continue;
        const net = nets.get(terminalId(part, terminal.name))!;
        if (!roles.has(net) && inferred.get(net) !== 'return')
          inferred.set(net, role);
      }
    }
  }
  const result: Record<string, WireRole> = {};
  for (const wire of circuit.wires) {
    const net = nets.get(wire.from)!;
    result[wire.id] = roles.get(net) ?? inferred.get(net) ?? 'unknown';
  }
  // Only follow exclusive filter spurs through degree-two hops. The arriving
  // lead belongs to the filter, but a tap/junction and every switch terminal
  // are boundaries: the shared HOT backbone must keep its color and flow.
  const filterRoles = new Map<string, 'tone' | 'lc' | 'shared'>();
  for (const [terminal, role] of filters) {
    // A filter terminal can itself be used as a signal junction, not a spur.
    if (graph.get(terminal)!.length !== 1) continue;
    const queue = [terminal];
    const seen = new Set(queue);
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]!;
      if (
        current !== terminal &&
        (seeds.has(current) ||
          filters.has(current) ||
          switchTerminals.has(current) ||
          graph.get(current)!.length !== 2)
      )
        continue;
      for (const edge of graph.get(current)!) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        const previous = filterRoles.get(edge.wire!);
        filterRoles.set(
          edge.wire!,
          previous && previous !== role ? 'shared' : role,
        );
        queue.push(edge.to);
      }
    }
  }
  // Conflicting filter-only labels retain the underlying role, rather than
  // choosing a color from part/wire iteration order.
  for (const [wire, role] of filterRoles)
    if (role !== 'shared') result[wire] = role;
  for (const id of groundPresentation(circuit).groundWires)
    result[id] = 'ground';
  return result;
}

export function signalFlowDirections(
  circuit: Circuit,
  estimate: Estimate,
): Record<string, FlowDirection> {
  if (!isCircuit(circuit) || estimate.status === 'unavailable') return {};
  const jack = circuit.parts.find((part) => part.kind === 'jack');
  if (!jack || !estimate.activePickups.length) return {};
  const graph = new Map<string, Edge[]>();
  const join = (from: string, to: string, wire?: string) => {
    graph.set(from, [...(graph.get(from) ?? []), { to, wire }]);
    graph.set(to, [...(graph.get(to) ?? []), { to: from, wire }]);
  };
  // Use exactly the analyzer's selected paths, not every energized net. Zero
  // level output edges preserve orientation at volume zero, but never animate.
  for (const wire of circuit.wires)
    if (wire.id in estimate.wireLevels) join(wire.from, wire.to, wire.id);
  for (const part of circuit.parts) {
    for (const [from, to] of switchConnections(part)) join(from, to);
    if (potRole(part) === 'volume')
      join(terminalId(part, 'input'), terminalId(part, 'wiper'));
    if (!estimate.activePickups.includes(part.id)) continue;
    if (part.kind === 'pickup')
      join(terminalId(part, 'return'), terminalId(part, 'hot'));
    if (part.kind === 'humbucker')
      for (const coil of estimate.activeCoils[part.id] ?? [])
        join(
          terminalId(part, `${coil}-finish`),
          terminalId(part, `${coil}-start`),
        );
  }
  const reachable = (omitted?: string) => {
    const queue = [terminalId(jack, 'tip')];
    const seen = new Set(queue);
    for (let index = 0; index < queue.length; index++)
      for (const edge of graph.get(queue[index]!) ?? []) {
        if (
          (omitted !== undefined && edge.wire === omitted) ||
          seen.has(edge.to)
        )
          continue;
        seen.add(edge.to);
        queue.push(edge.to);
      }
    return seen;
  };
  const connected = reachable();
  const result: Record<string, FlowDirection> = {};
  for (const wire of circuit.wires) {
    if (!(estimate.wireLevels[wire.id]! > 0)) continue;
    const without = reachable(wire.id);
    // Only bridges have an unambiguous outputward direction. Cycles/shared
    // alternate paths get a static highlight, never a guessed current arrow.
    result[wire.id] =
      !connected.has(wire.from) ||
      without.has(wire.from) === without.has(wire.to)
        ? 'static'
        : without.has(wire.to)
          ? 'forward'
          : 'reverse';
  }
  return result;
}
