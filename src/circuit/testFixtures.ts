import { blankCircuit, createPart, type Circuit } from './model';

export function legacyCircuit(): Circuit {
  return {
    ...blankCircuit(),
    parts: [
      { ...createPart('pickup', 'neck'), label: 'Neck pickup' },
      { ...createPart('pickup', 'bridge', 1), label: 'Bridge pickup' },
      createPart('selector', 'selector', 2),
      createPart('volume', 'volume', 3),
      createPart('tone', 'tone', 4),
      createPart('capacitor', 'capacitor', 5),
      createPart('jack', 'jack', 6),
    ],
    wires: [
      ['neck:hot', 'selector:neck'],
      ['bridge:hot', 'selector:bridge'],
      ['selector:common', 'volume:input'],
      ['volume:wiper', 'jack:tip'],
      ['volume:input', 'tone:input'],
      ['tone:wiper', 'capacitor:a'],
      ['capacitor:b', 'jack:sleeve'],
      ['volume:ground', 'jack:sleeve'],
      ['neck:return', 'jack:sleeve'],
      ['bridge:return', 'jack:sleeve'],
    ].map(([from, to], index) => ({
      id: `wire-${index}`,
      from: from!,
      to: to!,
    })),
  };
}

export function legacyV1() {
  const { parts, wires } = legacyCircuit();
  return { version: 1, parts, wires };
}

// Keep the previous v2 preset independent of the current single-coil default.
export function humbuckerCircuit(): Circuit {
  const circuit = legacyCircuit();
  return {
    ...circuit,
    metadata: {
      title: 'Two humbuckers · 3-way blade',
      creator: 'Pickup Lab',
      sourceUrl: '',
      permission: 'Original educational preset. Reuse terms not specified.',
    },
    parts: circuit.parts.map((part) => ({
      ...part,
      kind:
        part.kind === 'pickup'
          ? 'humbucker'
          : part.kind === 'selector'
            ? 'blade'
            : part.kind,
    })),
    wires: [
      ['neck:a-start', 'selector:a1'],
      ['bridge:a-start', 'selector:b3'],
      ['selector:a-common', 'volume:input'],
      ['volume:wiper', 'jack:tip'],
      ['volume:input', 'tone:input'],
      ['tone:wiper', 'capacitor:a'],
      ['capacitor:b', 'jack:sleeve'],
      ['volume:ground', 'jack:sleeve'],
      ['neck:b-finish', 'jack:sleeve'],
      ['bridge:b-finish', 'jack:sleeve'],
      ['selector:a1', 'selector:a2'],
      ['selector:b3', 'selector:b2'],
      ['selector:b-common', 'selector:a-common'],
      ['neck:a-finish', 'neck:b-start'],
      ['bridge:a-finish', 'bridge:b-start'],
      ['neck:shield', 'jack:sleeve'],
      ['bridge:shield', 'jack:sleeve'],
      ['volume:casing', 'jack:sleeve'],
      ['tone:casing', 'jack:sleeve'],
    ].map(([from, to], index) => ({
      id: `wire-${index}`,
      from: from!,
      to: to!,
    })),
  };
}
