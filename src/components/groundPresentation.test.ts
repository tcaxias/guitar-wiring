import { expect, it } from 'vitest';
import { analyze } from '../circuit/analyze';
import { fourWayTeleCircuit, splitHumbuckerCircuit } from '../circuit/library';
import {
  createPart,
  presetCircuit,
  switchConnections,
  type PartKind,
} from '../circuit/model';
import { groundPresentation } from './groundPresentation';

it.each([1, 2, 3, 4])(
  'keeps four-way RETURN physical in position %s without changing electrical ground',
  (value) => {
    const circuit = fourWayTeleCircuit();
    circuit.parts.find((part) => part.id === 'selector')!.value = value;
    const original = JSON.stringify(circuit);
    const estimate = analyze(circuit);
    const view = groundPresentation(circuit);
    expect(estimate.groundedTerminals.includes('neck:return')).toBe(value <= 2);
    expect(view.groundedTerminals.has('neck:return')).toBe(false);
    expect(view.groundedTerminals.has('selector:b-common')).toBe(false);
    expect(view.groundWires.has('wire-3')).toBe(false);
    expect(view.hiddenWires.has('wire-3')).toBe(false);
    for (const id of ['neck:shield', 'selector:b1', 'selector:b2'])
      expect(view.groundedTerminals.has(id)).toBe(true);
    for (const id of ['wire-7', 'wire-8', 'wire-9'])
      expect(view.hiddenWires.has(id)).toBe(true);
    expect(view).toEqual(groundPresentation(fourWayTeleCircuit()));
    expect(analyze(circuit)).toEqual(estimate);
    expect(JSON.stringify(circuit)).toBe(original);
  },
);

it.each(['neck', 'both', 'bridge'] as const)(
  'keeps three-way ground feeds separate from signal in %s',
  (position) => {
    const circuit = presetCircuit();
    circuit.parts.find((part) => part.id === 'selector')!.position = position;
    const view = groundPresentation(circuit);
    expect([...view.hiddenWires].sort()).toEqual(
      analyze(circuit).groundWires.sort(),
    );
    expect(view.groundedTerminals.has('neck:return')).toBe(true);
    expect(view.groundedTerminals.has('neck:hot')).toBe(false);
  },
);

it.each([false, true])(
  'preserves split links when pulled is %s',
  (isPulled) => {
    const circuit = splitHumbuckerCircuit();
    circuit.parts.find((part) => part.id === 'volume')!.isPulled = isPulled;
    const view = groundPresentation(circuit);
    expect(analyze(circuit).groundedTerminals.includes('neck:a-finish')).toBe(
      isPulled,
    );
    for (const id of [
      'neck:a-finish',
      'neck:b-start',
      'volume:switch-a-common',
    ])
      expect(view.groundedTerminals.has(id)).toBe(false);
    for (const id of ['neck:shield', 'bridge:shield', 'volume:switch-a2'])
      expect(view.groundedTerminals.has(id)).toBe(true);
    for (const wire of circuit.wires.filter(
      (wire) => wire.from === 'neck:a-finish',
    ))
      expect(view.hiddenWires.has(wire.id)).toBe(false);
    expect(view).toEqual(groundPresentation(splitHumbuckerCircuit()));
  },
);

it.each(['blade', 'blade4', 'push-pull-volume'] as PartKind[])(
  'does not mark unwired closed %s contacts; wire/switch cycles terminate',
  (kind) => {
    const part = createPart(kind, 'switch');
    const contacts = switchConnections(part);
    const circuit = {
      ...presetCircuit(),
      parts: [part, createPart('jack', 'jack')],
      wires: [
        { id: 'ground', from: contacts[0]![0], to: 'jack:sleeve' },
        { id: 'cycle', from: contacts[0]![0], to: contacts[1]![0] },
        { id: 'second-ground', from: contacts[1]![0], to: 'jack:sleeve' },
      ],
    };
    const view = groundPresentation(circuit);
    for (const [from, to] of contacts) {
      expect(view.groundedTerminals.has(from)).toBe(true);
      expect(view.groundedTerminals.has(to)).toBe(false);
      expect(analyze(circuit).groundedTerminals).toContain(to);
    }
    expect(view.hiddenWires.has('cycle')).toBe(false);
    expect(view.groundWires.has('cycle')).toBe(true);
  },
);

it('keeps shorted signal interconnects visible and the fault electrically true', () => {
  const circuit = presetCircuit();
  circuit.wires.push({ id: 'short', from: 'jack:tip', to: 'jack:sleeve' });
  const view = groundPresentation(circuit);
  expect(view.groundedTerminals.has('volume:wiper')).toBe(true);
  expect(view.groundWires.has('wire-3')).toBe(true);
  expect(view.hiddenWires.has('wire-3')).toBe(false);
  expect(analyze(circuit).message).toBe('Output shorted to ground.');
  circuit.wires.push({
    id: 'input-short',
    from: 'volume:input',
    to: 'ground:common',
  });
  const inputShort = groundPresentation(circuit);
  for (const id of ['wire-2', 'wire-4', 'wire-12'])
    expect(inputShort.hiddenWires.has(id)).toBe(false);
});

it('retains floating and switch-routed junctions, but hides directly wired grounds', () => {
  const circuit = fourWayTeleCircuit();
  circuit.parts.push(
    createPart('ground', 'switched'),
    createPart('ground', 'floating'),
  );
  circuit.wires.push({
    id: 'switched',
    from: 'switched:common',
    to: 'selector:b-common',
  });
  const view = groundPresentation(circuit);
  expect(analyze(circuit).groundNodes.switched?.isConnected).toBe(true);
  expect([...view.hiddenParts]).toEqual(['ground']);
  expect(view.hiddenWires.has('switched')).toBe(false);
  circuit.wires = circuit.wires.filter((wire) => wire.to !== 'jack:sleeve');
  const disconnected = groundPresentation(circuit);
  expect([...disconnected.groundedTerminals]).toEqual(['jack:sleeve']);
  expect(disconnected.hiddenWires.size).toBe(0);
  expect(disconnected.hiddenParts.size).toBe(0);
});

it.each(['invalid', 'missing', 'multiple'])(
  'leaves %s output wiring visible',
  (condition) => {
    const circuit = presetCircuit();
    if (condition === 'invalid')
      circuit.wires.push({
        id: 'invalid',
        from: 'missing:pin',
        to: 'jack:sleeve',
      });
    if (condition === 'missing') {
      circuit.parts = circuit.parts.filter((part) => part.kind !== 'jack');
      circuit.wires = circuit.wires.filter(
        (wire) => !wire.to.startsWith('jack:'),
      );
    }
    if (condition === 'multiple')
      circuit.parts.push(createPart('jack', 'second-jack'));
    const view = groundPresentation(circuit);
    expect(view.groundedTerminals.size).toBe(0);
    expect(view.groundWires.size).toBe(0);
    expect(view.hiddenWires.size).toBe(0);
    expect(view.hiddenParts.size).toBe(0);
  },
);
