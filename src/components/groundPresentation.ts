import { terminalId, terminalsFor, type Circuit } from '../circuit/model';
import { isCircuit } from '../circuit/validation';

export function groundPresentation(circuit: Circuit) {
  const groundedTerminals = new Set<string>();
  const groundWires = new Set<string>();
  const hiddenWires = new Set<string>();
  const hiddenParts = new Set<string>();
  const result = { groundedTerminals, groundWires, hiddenWires, hiddenParts };
  const jacks = circuit.parts.filter((part) => part.kind === 'jack');
  if (!isCircuit(circuit) || jacks.length !== 1) return result;

  const graph = new Map<string, string[]>();
  const groundPins = new Set<string>();
  for (const part of circuit.parts)
    for (const terminal of terminalsFor(part)) {
      const id = terminalId(part, terminal.name);
      graph.set(id, []);
      if (
        part.kind === 'ground' ||
        ['ground', 'casing', 'shield', 'sleeve'].includes(terminal.name)
      )
        groundPins.add(id);
    }
  for (const wire of circuit.wires) {
    graph.get(wire.from)!.push(wire.to);
    graph.get(wire.to)!.push(wire.from);
  }
  // A closed switch grounds a net electrically, but does not replace its
  // physical lead with a permanent ground connection in the diagram.
  const sleeve = terminalId(jacks[0]!, 'sleeve');
  const queue = [sleeve];
  groundedTerminals.add(sleeve);
  for (let index = 0; index < queue.length; index++)
    for (const next of graph.get(queue[index]!)!)
      if (!groundedTerminals.has(next)) {
        groundedTerminals.add(next);
        queue.push(next);
      }
  for (const wire of circuit.wires)
    if (groundedTerminals.has(wire.from)) {
      groundWires.add(wire.id);
      // Keep signal interconnects/jumpers inspectable even when a wiring fault
      // shorts their net to sleeve. Only explicit ground feeds collapse.
      if (groundPins.has(wire.from) || groundPins.has(wire.to))
        hiddenWires.add(wire.id);
    }
  for (const part of circuit.parts)
    if (
      part.kind === 'ground' &&
      groundedTerminals.has(terminalId(part, 'common'))
    )
      hiddenParts.add(part.id);
  return result;
}
