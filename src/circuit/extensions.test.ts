import { describe, expect, it } from 'vitest';
import { analyze } from './analyze';
import { reduceCoilNetwork, type CoilEdge } from './coilNetwork';
import {
  exampleLibrary,
  fourWayTeleCircuit,
  splitHumbuckerCircuit,
  varitoneCircuit,
} from './library';
import {
  blankCircuit,
  bladePosition,
  connect,
  createPart,
  isBladePart,
  isPushPullPart,
  partLabels,
  potRole,
  presetCircuit,
  removePart,
  switchConnections,
  terminalsFor,
  terminalPoints,
  varitoneInductanceHenries,
  varitoneSetting,
  varitoneSettings,
  type Circuit,
  type Part,
  type PartKind,
} from './model';
import { migrateCircuit, parseCircuitText, serializeCircuit } from './portable';
import { legacyV1 } from './testFixtures';
import { isCircuit } from './validation';

const update = (
  circuit: Circuit,
  id: string,
  changes: Partial<Part>,
): Circuit => ({
  ...circuit,
  parts: circuit.parts.map((part) =>
    part.id === id ? { ...part, ...changes } : part,
  ),
});
const without = (circuit: Circuit, terminal: string): Circuit => ({
  ...circuit,
  wires: circuit.wires.filter(
    (wire) => wire.from !== terminal && wire.to !== terminal,
  ),
});

describe('instance terminals and independent mechanical switches', () => {
  it.each(['push-pull-volume', 'push-pull-tone'] as const)(
    'has independent DPDT contacts for %s',
    (kind) => {
      for (const isPulled of [undefined, false, true])
        for (const value of [0, 5, 10]) {
          const part = {
            ...createPart(kind, 'pot'),
            value,
            ...(isPulled === undefined ? {} : { isPulled }),
          };
          expect(switchConnections(part)).toEqual([
            ['pot:switch-a-common', `pot:switch-a${isPulled ? 2 : 1}`],
            ['pot:switch-b-common', `pot:switch-b${isPulled ? 2 : 1}`],
          ]);
          expect(terminalsFor(part)).toHaveLength(10);
          expect(potRole(part)).toBe(
            kind === 'push-pull-volume' ? 'volume' : 'tone',
          );
          expect(isPushPullPart(part)).toBe(true);
        }
    },
  );

  it.each([1, 2, 3, 4])(
    'closes only blade4 throws %s on both poles',
    (value) => {
      const part = { ...createPart('blade4', 'blade'), value };
      expect(terminalsFor(part)).toHaveLength(10);
      expect(bladePosition(part)).toBe(value);
      expect(isBladePart(part)).toBe(true);
      expect(switchConnections(part)).toEqual([
        ['blade:a-common', `blade:a${value}`],
        ['blade:b-common', `blade:b${value}`],
      ]);
    },
  );

  it('keeps new side-bank pitches and exits legible at the unchanged scale', () => {
    for (const kind of [
      'push-pull-volume',
      'push-pull-tone',
      'blade4',
    ] as const)
      for (const exit of ['left', 'right']) {
        const bank = terminalsFor(createPart(kind, 'part')).filter(
          (terminal) =>
            terminal.exit === exit &&
            (kind === 'blade4' || terminal.name.startsWith('switch-')),
        );
        expect(bank.length).toBe(kind === 'blade4' ? 5 : 3);
        expect(new Set(bank.map((terminal) => terminal.label)).size).toBe(
          bank.length,
        );
        bank
          .slice(1)
          .forEach((terminal, index) =>
            expect(terminal.y - bank[index]!.y).toBeGreaterThanOrEqual(40),
          );
      }
  });

  it('adds a separate cover terminal only to opted-in single coils', () => {
    const pickup = createPart('pickup', 'pickup');
    expect(terminalsFor(pickup)).toHaveLength(2);
    const shielded = { ...pickup, hasSeparateShield: true };
    expect(terminalsFor(shielded).map((terminal) => terminal.name)).toEqual([
      'hot',
      'return',
      'shield',
    ]);
    expect(
      terminalPoints({ ...blankCircuit(), parts: [shielded] }).has(
        'pickup:shield',
      ),
    ).toBe(true);
    expect(partLabels.pickup).toBe('Single coil');
  });
});

describe('split humbuckers and series / parallel circuits', () => {
  it.each([false, true])(
    'uses actual wires, independent from pot turning (pulled=%s)',
    (isPulled) => {
      for (const value of [0, 4, 10]) {
        const estimate = analyze(
          update(splitHumbuckerCircuit(), 'volume', { value, isPulled }),
        );
        expect(estimate.output).toBe(value * 10);
        expect(estimate.activeCoils).toEqual({
          neck: isPulled ? ['a'] : ['a', 'b'],
          bridge: isPulled ? ['a'] : ['a', 'b'],
        });
        expect(estimate.pickupTopology).toBe('parallel');
      }
    },
  );

  it('retains the B coil when the DPDT shorts A instead', () => {
    let circuit = update(splitHumbuckerCircuit(), 'volume', { isPulled: true });
    circuit = {
      ...circuit,
      wires: circuit.wires.map((wire) =>
        wire.from === 'volume:switch-a2'
          ? { ...wire, to: 'neck:a-start' }
          : wire.from === 'volume:switch-b2'
            ? { ...wire, to: 'bridge:a-start' }
            : wire,
      ),
    };
    expect(analyze(circuit).activeCoils).toEqual({
      neck: ['b'],
      bridge: ['b'],
    });
    expect(analyze(circuit).output).toBe(100);
    expect(
      analyze(update(circuit, 'volume', { isPulled: false })).activeCoils,
    ).toEqual({ neck: ['a', 'b'], bridge: ['a', 'b'] });
  });

  it('distinguishes grounded A-only splits from an output-wide short', () => {
    const split = update(splitHumbuckerCircuit(), 'volume', { isPulled: true });
    expect(analyze(split)).toMatchObject({
      output: 100,
      status: 'live',
      activeCoils: { neck: ['a'], bridge: ['a'] },
    });
    const short = analyze(
      connect(split, 'jack:tip', 'jack:sleeve', 'output-short'),
    );
    expect(short).toMatchObject({
      output: 0,
      status: 'silent',
      activePickups: [],
      activeCoils: {},
      wireLevels: {},
      groundWireLevels: {},
      toneWireLevels: {},
    });
    expect(short.message).toMatch(/shorted/);
  });

  it('does not split when the throw has no ground connection', () => {
    const circuit = without(
      without(splitHumbuckerCircuit(), 'volume:switch-a2'),
      'volume:switch-b2',
    );
    expect(
      analyze(update(circuit, 'volume', { isPulled: true })).activeCoils,
    ).toEqual({ neck: ['a', 'b'], bridge: ['a', 'b'] });
  });

  it.each([
    [1, ['neck'], 'single'],
    [2, ['neck', 'bridge'], 'parallel'],
    [3, ['bridge'], 'single'],
    [4, ['neck', 'bridge'], 'series'],
  ] as const)(
    'recognizes 4-way position %s',
    (value, activePickups, pickupTopology) => {
      const circuit = update(fourWayTeleCircuit(), 'selector', { value });
      const estimate = analyze(circuit);
      expect(estimate).toMatchObject({
        status: 'live',
        output: 100,
        activePickups,
        pickupTopology,
      });
      const cover = circuit.wires.find((wire) => wire.from === 'neck:shield')!;
      expect(estimate.groundWires).toContain(cover.id);
      expect(estimate.groundWireLevels[cover.id]).toBeUndefined();
      const neckHot = circuit.wires.find((wire) => wire.from === 'neck:hot')!;
      expect(estimate.wireLevels[neckHot.id] ?? 0).toBe(value === 3 ? 0 : 1);
      const neckReturn = circuit.wires.find(
        (wire) => wire.to === 'neck:return',
      )!;
      expect(estimate.wireLevels[neckReturn.id] ?? 0).toBe(value === 4 ? 1 : 0);
      if (value === 4 || value === 3) {
        expect(estimate.groundWires).not.toContain(neckReturn.id);
        expect(estimate.groundWireLevels[neckReturn.id]).toBeUndefined();
      }
    },
  );

  it('rejects a cover bonded to the switching series junction rather than ground', () => {
    const circuit = update(fourWayTeleCircuit(), 'selector', { value: 4 });
    const wrong = connect(
      without(circuit, 'neck:shield'),
      'neck:shield',
      'neck:return',
      'wrong-cover',
    );
    expect(analyze(wrong).status).toBe('unavailable');
    expect(analyze(wrong).message).toMatch(/shields/);
    expect(analyze(without(circuit, 'neck:shield')).output).toBe(100);
  });

  it('does not replace a missing return with the separate shield', () => {
    const estimate = analyze(
      without(
        update(fourWayTeleCircuit(), 'selector', { value: 4 }),
        'bridge:return',
      ),
    );
    expect(estimate.output).toBe(0);
    expect(estimate.wireLevels).toEqual({});
  });

  it('counts push-pull and normal pots together for master-control limits', () => {
    const circuit = splitHumbuckerCircuit();
    circuit.parts.push(createPart('volume', 'extra-volume'));
    expect(analyze(circuit).status).toBe('unavailable');
    const tone = update(presetCircuit(), 'tone', {
      kind: 'push-pull-tone',
      isPulled: true,
      value: 0,
    });
    expect(analyze(tone).toneDiversion).toBe(100);
    expect(analyze(tone).output).toBe(100);
  });
});

const coil = (id: string, from: number, to: number): CoilEdge => ({
  pickupId: id,
  from,
  to,
  hot: `${id}:hot`,
  return: `${id}:return`,
});

describe('bounded coil reduction', () => {
  it('reduces mixed nested networks and ignores unrelated components', () => {
    const result = reduceCoilNetwork(
      [
        coil('a', 0, 1),
        coil('b', 1, 3),
        coil('c', 0, 3),
        coil('unrelated', 7, 8),
      ],
      0,
      3,
    );
    expect(result.reason).toBeUndefined();
    expect(result.topology).toBe('mixed');
    expect(result.active.map((edge) => edge.pickupId).sort()).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('rejects conflicting relative polarity without invented contribution', () => {
    const result = reduceCoilNetwork([coil('a', 0, 1), coil('b', 1, 0)], 0, 1);
    expect(result.reason).toMatch(/polarity/);
    expect(result.active).toEqual([]);
    expect(
      reduceCoilNetwork([coil('a', 0, 1), coil('b', 2, 1)], 0, 2).reason,
    ).toMatch(/polarity/);
  });

  it('rejects an irreducible Wheatstone bridge', () => {
    const result = reduceCoilNetwork(
      [
        coil('a', 0, 1),
        coil('b', 1, 3),
        coil('c', 0, 2),
        coil('d', 2, 3),
        coil('e', 1, 2),
      ],
      0,
      3,
    );
    expect(result.reason).toMatch(/irreducible/);
    expect(result.active).toEqual([]);
  });

  it('prunes floating branches, same-net shorts and attached reducible cycles', () => {
    const result = reduceCoilNetwork(
      [
        coil('live', 0, 3),
        coil('short', 0, 0),
        coil('floating', 0, 9),
        coil('cycle-a', 0, 1),
        coil('cycle-b', 1, 2),
        coil('cycle-c', 2, 0),
      ],
      0,
      3,
    );
    expect(result.active.map((edge) => edge.pickupId)).toEqual(['live']);
    expect(reduceCoilNetwork([coil('open', 0, 1)], 0, 3).active).toEqual([]);
    expect(reduceCoilNetwork([coil('shorted', 0, 1)], 0, 0).active).toEqual([]);
  });

  it('ignores an irreducible cyclic lobe attached at just one source junction', () => {
    const result = reduceCoilNetwork(
      [
        coil('live', 0, 5),
        coil('a', 0, 1),
        coil('b', 1, 3),
        coil('c', 0, 2),
        coil('d', 2, 3),
        coil('e', 1, 2),
      ],
      0,
      5,
    );
    expect(result.reason).toBeUndefined();
    expect(result.active.map((edge) => edge.pickupId)).toEqual(['live']);
  });

  it('reduces the maximum 48-coil chain deterministically', () => {
    const coils = Array.from({ length: 48 }, (_, index) =>
      coil(`coil-${index}`, index, index + 1),
    );
    const result = reduceCoilNetwork(coils, 0, 48);
    expect(result.active).toHaveLength(48);
    expect(result.topology).toBe('series');
    expect(reduceCoilNetwork(coils, 0, 48)).toEqual(result);
  });
});

describe('qualitative series LC shunt', () => {
  it('has the six agreed settings and ideal reference frequencies', () => {
    expect(varitoneInductanceHenries).toBe(1.5);
    expect(
      varitoneSettings.map((setting) => setting.capacitanceNanofarads),
    ).toEqual([null, 1, 3, 10, 30, 220]);
    expect(varitoneSettings.map((setting) => setting.frequencyHz)).toEqual([
      null,
      4109,
      2373,
      1299,
      750,
      277,
    ]);
  });

  it.each([1, 2, 3, 4, 5, 6])(
    'keeps output live without an ideal DC short at position %s',
    (value) => {
      const circuit = update(varitoneCircuit(), 'varitone', { value });
      const estimate = analyze(circuit);
      const setting = varitoneSetting(
        circuit.parts.find((part) => part.id === 'varitone')!,
      );
      expect(estimate).toMatchObject({
        output: 100,
        status: 'live',
        treble: 100,
      });
      expect(estimate.varitone).toEqual({
        partId: 'varitone',
        position: value,
        isBypassed: value === 1,
        isConnected: true,
        frequencyHz: setting.frequencyHz,
        capacitanceNanofarads: setting.capacitanceNanofarads,
        level: value === 1 ? 0 : 1,
      });
      expect(estimate.varitoneWireLevels['varitone-signal'] ?? 0).toBe(
        value === 1 ? 0 : 1,
      );
      expect(estimate.wireLevels['varitone-ground']).toBeUndefined();
      expect(
        switchConnections(
          circuit.parts.find((part) => part.id === 'varitone')!,
        ),
      ).toEqual([]);
    },
  );

  it('preserves audio but does not light a missing ground, missing signal or unsupported tap', () => {
    const circuit = update(varitoneCircuit(), 'varitone', { value: 4 });
    const unsupported = connect(
      without(circuit, 'varitone:signal'),
      'varitone:signal',
      'tone:wiper',
      'unsupported-tap',
    );
    for (const invalid of [
      without(circuit, 'varitone:ground'),
      without(circuit, 'varitone:signal'),
      unsupported,
    ]) {
      const estimate = analyze(invalid);
      expect(estimate.output).toBe(100);
      expect(estimate.varitone).toMatchObject({ level: 0, isConnected: false });
      expect(estimate.varitoneWireLevels).toEqual({});
      expect(estimate.notes.join(' ')).toMatch(/Varitone branch disconnected/);
    }
  });

  it('requires an active source and scales output-side taps by master volume only', () => {
    const circuit = update(varitoneCircuit(), 'varitone', { value: 3 });
    const noSource = analyze(removePart(removePart(circuit, 'neck'), 'bridge'));
    expect(noSource.varitone?.level).toBe(0);
    expect(noSource.varitoneWireLevels).toEqual({});
    expect(
      analyze(update(circuit, 'volume', { value: 0 })).varitone?.level,
    ).toBe(1);
    const outputSide = connect(
      without(circuit, 'varitone:signal'),
      'varitone:signal',
      'jack:tip',
      'output-tap',
    );
    for (const value of [0, 5, 10]) {
      const estimate = analyze(update(outputSide, 'volume', { value }));
      expect(estimate.varitone?.level).toBe(value / 10);
      expect(estimate.varitoneWireLevels['output-tap'] ?? 0).toBe(value / 10);
    }
  });

  it('rejects multiple modules explicitly', () => {
    const circuit = varitoneCircuit();
    circuit.parts.push(createPart('varitone', 'extra'));
    expect(analyze(circuit).message).toMatch(/at most one Varitone/);
  });
});

describe('library and strict portable additions', () => {
  it.each(exampleLibrary)(
    'creates independent valid objects for $id',
    (example) => {
      const circuit = example.createCircuit();
      expect(isCircuit(circuit)).toBe(true);
      // Two independent master volumes/tones exceed the estimator's single-master
      // model, so that arrangement is explicitly unavailable; everything else
      // in the library estimates as live. The '50s variant is the same 2V/2T
      // arrangement — only the tone tap point differs.
      const expectedStatus =
        example.id === 'two-humbuckers-3way-2v-2t' ||
        example.id === 'two-humbuckers-3way-2v-2t-50s'
          ? 'unavailable'
          : 'live';
      expect(analyze(circuit).status).toBe(expectedStatus);
      expect(parseCircuitText(serializeCircuit(circuit))).toEqual(circuit);
      circuit.parts[0]!.label = 'Changed locally';
      expect(example.createCircuit().parts[0]!.label).not.toBe(
        'Changed locally',
      );
      if (example.id !== 'standard-tele') {
        expect(circuit.metadata.sourceUrl).toMatch(/^https:\/\//);
        expect(circuit.metadata.creator).toMatch(/Pickup Lab; reference:/);
        expect(circuit.metadata.permission).toBe(
          'Reference credited; reuse terms not specified.',
        );
      }
    },
  );

  it.each([
    ['pickup', 'p90'],
    ['pickup', 'dynasonic'],
    ['humbucker', 'filtertron'],
    ['humbucker', 'mini-humbucker'],
  ] as const)(
    'round-trips the %s skin %s without injecting properties',
    (kind, skin) => {
      const circuit = {
        ...blankCircuit(),
        parts: [{ ...createPart(kind, 'part'), skin }],
      };
      expect(migrateCircuit(circuit)).toBe(circuit);
      expect(parseCircuitText(serializeCircuit(circuit))).toEqual(circuit);
    },
  );

  it.each([
    { kind: 'pickup', skin: 'filtertron' },
    { kind: 'humbucker', skin: 'p90' },
    { kind: 'volume', skin: 'dynasonic' },
    { kind: 'pickup', skin: null },
    { kind: 'pickup', hasSeparateShield: 'true' },
    { kind: 'humbucker', hasSeparateShield: true },
    { kind: 'volume', isPulled: false },
    { kind: 'push-pull-tone', isPulled: 1 },
    { kind: 'blade4', value: 0 },
    { kind: 'blade4', value: 5 },
    { kind: 'blade4', value: 2.5 },
    { kind: 'varitone', value: 0 },
    { kind: 'varitone', value: 7 },
    { kind: 'varitone', value: 1.5 },
  ])('rejects illegal properties $kind / $value / $skin', (changes) => {
    expect(
      isCircuit({
        ...blankCircuit(),
        parts: [
          { ...createPart(changes.kind as PartKind, 'part'), ...changes },
        ],
      }),
    ).toBe(false);
  });

  it('rejects every new optional and kind in strict v1', () => {
    const legacy = legacyV1();
    for (const changes of [
      { skin: 'p90' },
      { hasSeparateShield: false },
      { isPulled: false },
    ])
      expect(
        migrateCircuit({
          ...legacy,
          parts: legacy.parts.map((part, index) =>
            index === 0 ? { ...part, ...changes } : part,
          ),
        }),
      ).toBeNull();
    for (const kind of [
      'push-pull-volume',
      'push-pull-tone',
      'blade4',
      'varitone',
    ] as const)
      expect(
        migrateCircuit({
          ...legacy,
          parts: [...legacy.parts, createPart(kind, 'new')],
        }),
      ).toBeNull();
  });

  it('round-trips explicit false flags and push-pull tone ratings without defaults', () => {
    const circuit: Circuit = {
      ...blankCircuit(),
      parts: [
        {
          ...createPart('pickup', 'single'),
          hasSeparateShield: false,
          skin: 'p90',
        },
        {
          ...createPart('push-pull-tone', 'tone'),
          isPulled: false,
          resistanceKOhms: 1000,
        },
        createPart('push-pull-volume', 'volume'),
      ],
    };
    expect(migrateCircuit(circuit)).toBe(circuit);
    expect(parseCircuitText(serializeCircuit(circuit))).toEqual(circuit);
    expect(Object.hasOwn(circuit.parts[2]!, 'isPulled')).toBe(false);
    const shieldWire = {
      id: 'shield',
      from: 'single:shield',
      to: 'tone:casing',
    };
    expect(isCircuit({ ...circuit, wires: [shieldWire] })).toBe(false);
    expect(
      isCircuit(
        update({ ...circuit, wires: [shieldWire] }, 'single', {
          hasSeparateShield: true,
        }),
      ),
    ).toBe(true);
  });

  it('keeps existing v2 objects and custom labels exactly as received', () => {
    const circuit = presetCircuit();
    circuit.parts[0]!.label = 'Custom pickup label';
    const before = JSON.stringify(circuit);
    expect(migrateCircuit(circuit)).toBe(circuit);
    expect(JSON.stringify(circuit)).toBe(before);
  });
});
