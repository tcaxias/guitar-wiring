import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { analyze } from './analyze';
import {
  createPart,
  presetCircuit,
  switchConnections,
  type Circuit,
  type PartKind,
} from './model';
import {
  fourWayTeleCircuit,
  splitHumbuckerCircuit,
  varitoneCircuit,
} from './library';

it.each([
  ['blade', 1],
  ['blade', 2],
  ['blade', 3],
  ['blade4', 1],
  ['blade4', 2],
  ['blade4', 3],
  ['blade4', 4],
  ['push-pull-volume', 0],
  ['push-pull-volume', 1],
] as [PartKind, number][])(
  'includes closed %s contacts without external wires in state %s',
  (kind, position) => {
    const part = {
      ...createPart(kind, 'switch'),
      value: position || 10,
      ...(kind === 'blade'
        ? { position: (['neck', 'both', 'bridge'] as const)[position - 1]! }
        : {}),
      ...(kind === 'push-pull-volume' ? { isPulled: position === 1 } : {}),
    };
    const contacts = switchConnections(part);
    if (kind === 'blade' || kind === 'blade4')
      expect(contacts).toEqual(
        ['a', 'b'].map((pole) => [
          `switch:${pole}-common`,
          `switch:${pole}${position}`,
        ]),
      );
    for (const [from, to] of contacts) {
      const circuit: Circuit = {
        ...presetCircuit(),
        parts: [part, createPart('jack', 'jack')],
        wires: [{ id: 'ground', from, to: 'jack:sleeve' }],
      };
      const grounded = analyze(circuit).groundedTerminals;
      expect([...grounded].sort()).toEqual([from, to, 'jack:sleeve'].sort());
    }
  },
);

it.each([1, 2, 3, 4])(
  'separates cover ground and four-way RETURN in position %s',
  (value) => {
    const circuit = fourWayTeleCircuit();
    circuit.parts.find((part) => part.id === 'selector')!.value = value;
    const result = analyze(circuit);
    expect(result.groundedTerminals).toContain('neck:shield');
    expect(result.groundedTerminals.includes('neck:return')).toBe(value <= 2);
    const wire = circuit.wires.find((wire) => wire.to === 'neck:return')!;
    expect(result.groundWires.includes(wire.id)).toBe(value <= 2);
    if (value === 4) expect(result.wireLevels[wire.id]).toBe(1);
  },
);

it.each([false, true])(
  'grounds only actual split contacts, independent of pot rotation: %s',
  (isPulled) => {
    const circuit = splitHumbuckerCircuit();
    const volume = circuit.parts.find((part) => part.id === 'volume')!;
    volume.isPulled = isPulled;
    volume.value = 0;
    const grounded = analyze(circuit).groundedTerminals;
    expect(grounded.includes('neck:a-finish')).toBe(isPulled);
    expect(grounded.includes('volume:switch-a-common')).toBe(isPulled);
    expect(grounded).toContain('volume:switch-a2');
    expect(grounded).not.toContain('volume:wiper');
    expect(grounded).not.toContain('jack:tip');
  },
);

it('does not claim isolated shields or floating junctions, and preserves reliable nets in unavailable estimates', () => {
  const circuit = splitHumbuckerCircuit();
  circuit.wires = circuit.wires.filter((wire) => wire.from !== 'neck:shield');
  expect(analyze(circuit).groundedTerminals).not.toContain('neck:shield');
  circuit.wires = circuit.wires.filter((wire) => wire.to !== 'jack:sleeve');
  const result = analyze(circuit);
  expect(result.status).toBe('unavailable');
  expect(result.groundedTerminals).toEqual(['jack:sleeve']);
  expect(result.groundNodes.ground?.isConnected).toBe(false);
  expect(result.groundWires).toEqual([]);
  circuit.wires.push({
    id: 'restore',
    from: 'ground:common',
    to: 'jack:sleeve',
  });
  circuit.parts.push(createPart('volume', 'extra-volume'));
  const multiVolume = analyze(circuit);
  expect(multiVolume.status).not.toBe('unavailable');
  expect(multiVolume.groundedTerminals).toContain('ground:common');
  expect(multiVolume.groundWires).toContain('restore');
  expect(multiVolume.groundNodes.ground).toEqual({
    isConnected: true,
    isActive: true,
  });
});

it('returns no grounded terminals for invalid, absent or ambiguous outputs', () => {
  const invalid = presetCircuit();
  invalid.wires.push({ id: 'invalid', from: 'missing:pin', to: 'jack:sleeve' });
  expect(analyze(invalid).groundedTerminals).toEqual([]);
  const absent = presetCircuit();
  absent.parts = absent.parts.filter((part) => part.kind !== 'jack');
  absent.wires = absent.wires.filter((wire) => !wire.to.startsWith('jack:'));
  expect(analyze(absent).groundedTerminals).toEqual([]);
  const multiple = presetCircuit();
  multiple.parts.push(createPart('jack', 'second-jack'));
  const result = analyze(multiple);
  expect(result.groundedTerminals).toEqual([]);
  expect(result.groundWires).toEqual([]);
  expect(result.groundNodes.ground?.isConnected).toBeNull();
});

it('marks a genuinely shorted tip without suppressing the fault', () => {
  const circuit = presetCircuit();
  circuit.wires.push({ id: 'short', from: 'jack:tip', to: 'jack:sleeve' });
  const result = analyze(circuit);
  expect(result.groundedTerminals).toContain('jack:tip');
  expect(result.message).toBe('Output shorted to ground.');
  expect(result.status).toBe('silent');
});

it('preserves every existing estimate field against pre-change checkpoint hashes', () => {
  const fixtures = [
    presetCircuit(),
    splitHumbuckerCircuit(),
    fourWayTeleCircuit(),
    varitoneCircuit(),
  ];
  fixtures[1]!.parts.find((part) => part.id === 'volume')!.isPulled = true;
  fixtures[2]!.parts.find((part) => part.id === 'selector')!.value = 4;
  fixtures[3]!.parts.find((part) => part.id === 'varitone')!.value = 6;
  fixtures[3]!.parts.find((part) => part.id === 'tone')!.value = 0;
  // Captured from artifacts/before-compact-ground, before changing the analyzer.
  const hashes = fixtures.map((circuit) => {
    const { groundedTerminals, ...priorFields } = analyze(circuit);
    expect(groundedTerminals.length).toBeGreaterThan(0);
    return createHash('sha256')
      .update(JSON.stringify(priorFields))
      .digest('hex');
  });
  expect(hashes).toEqual([
    'fdff910b41e33cae975c84ff0c753c8c07f474b1409cf053fae103df477e3b67',
    '57dec980acbef526c4d7adb2de1e38b4e2b3ebc634d8884eb86e011297df9994',
    '087998b2aa35f7d1111fd236d90683058ab4cd5b6d8b08c6c29026e5d5a757f7',
    '0268e207063b5f726a0524d7d232327583f30797e88c5fc693000bf7fe612b41',
  ]);
});
