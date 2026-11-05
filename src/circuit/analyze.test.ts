import { describe, expect, it } from 'vitest';
import { analyze } from './analyze';
import {
  blankCircuit,
  connect,
  createPart,
  presetCircuit as telePreset,
  removePart,
  type Circuit,
  type Part,
  switchConnections,
  terminals,
  terminalPoints,
  partScale,
} from './model';
import {
  legacyCircuit as presetCircuit,
  humbuckerCircuit as modernPreset,
} from './testFixtures';

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
const withoutWire = (circuit: Circuit, id: string): Circuit => ({
  ...circuit,
  wires: circuit.wires.filter((wire) => wire.id !== id),
});

describe('conservative parallel circuit estimate', () => {
  it.each([
    ['neck', ['neck']],
    ['both', ['neck', 'bridge']],
    ['bridge', ['bridge']],
  ] as const)('closes only %s selector contacts', (position, active) => {
    const result = analyze(update(presetCircuit(), 'selector', { position }));
    expect(result.status).toBe('live');
    expect(result.activePickups).toEqual(active);
    expect(result.wireLevels['wire-0'] ?? 0).toBe(
      active.includes('neck' as never) ? 1 : 0,
    );
    expect(result.wireLevels['wire-1'] ?? 0).toBe(
      active.includes('bridge' as never) ? 1 : 0,
    );
    expect(result.output).toBe(100);
  });

  it.each([0, 5, 10])(
    'models volume %s without dimming the pickup bus',
    (value) => {
      const result = analyze(update(presetCircuit(), 'volume', { value }));
      expect(result.output).toBe(value * 10);
      expect(result.wireLevels['wire-2']).toBe(1);
      expect(result.wireLevels['wire-3']).toBe(value / 10);
      expect(result.status).toBe(value ? 'live' : 'silent');
    },
  );

  it('keeps tone separate from output level', () => {
    const bright = analyze(presetCircuit());
    const warm = analyze(update(presetCircuit(), 'tone', { value: 0 }));
    expect(warm.output).toBe(bright.output);
    expect(warm.wireLevels).toEqual(bright.wireLevels);
    expect(warm.treble).toBeLessThan(bright.treble!);
  });

  it('mutes a shorted output and never traverses ground', () => {
    const result = analyze(
      connect(presetCircuit(), 'jack:tip', 'jack:sleeve', 'short'),
    );
    expect(result.output).toBe(0);
    expect(result.message).toMatch(/shorted/);
    expect(result.wireLevels).toEqual({});
  });

  it('mutes a shorted input', () => {
    const result = analyze(
      connect(presetCircuit(), 'volume:input', 'jack:sleeve', 'short'),
    );
    expect(result.output).toBe(0);
    expect(result.activePickups).toEqual([]);
  });

  it('excludes a pickup with an open return', () => {
    const result = analyze(withoutWire(presetCircuit(), 'wire-8'));
    expect(result.activePickups).toEqual(['bridge']);
    expect(result.notes).toEqual([
      'Neck pickup: floating return; no contribution.',
    ]);
    expect(result.wireLevels['wire-0']).toBeUndefined();
  });

  it('reports an open output', () => {
    const result = analyze(withoutWire(presetCircuit(), 'wire-3'));
    expect(result.output).toBe(0);
    expect(result.message).toMatch(/disconnected/);
  });

  it('is silent with no glow when every pickup return is open', () => {
    const result = analyze(
      withoutWire(withoutWire(presetCircuit(), 'wire-8'), 'wire-9'),
    );
    expect(result.status).toBe('silent');
    expect(result.output).toBe(0);
    expect(result.activePickups).toEqual([]);
    expect(result.wireLevels).toEqual({});
    expect(result.notes).toHaveLength(2);
  });

  it('estimates reversed nonpolar capacitor leads identically', () => {
    const circuit = presetCircuit();
    const reverse = (terminal: string) =>
      terminal === 'capacitor:a'
        ? 'capacitor:b'
        : terminal === 'capacitor:b'
          ? 'capacitor:a'
          : terminal;
    const reversed = {
      ...circuit,
      wires: circuit.wires.map((wire) => ({
        ...wire,
        from: reverse(wire.from),
        to: reverse(wire.to),
      })),
    };
    const original = analyze(circuit);
    expect(analyze(reversed)).toEqual({
      ...original,
      groundedTerminals: original.groundedTerminals.map(reverse),
    });
  });

  it('does not light a disconnected pickup hot lead', () => {
    const result = analyze(withoutWire(presetCircuit(), 'wire-0'));
    expect(result.activePickups).toEqual(['bridge']);
  });

  it('rejects a floating volume ground', () => {
    expect(analyze(withoutWire(presetCircuit(), 'wire-7')).status).toBe(
      'unavailable',
    );
  });

  it('rejects bypassed volume and incomplete tone layouts', () => {
    expect(
      analyze(
        connect(presetCircuit(), 'volume:input', 'volume:wiper', 'bypass'),
      ).status,
    ).toBe('unavailable');
    expect(analyze(withoutWire(presetCircuit(), 'wire-5')).status).toBe(
      'unavailable',
    );
  });

  it('excludes a coil bypassed by its hot-to-return wire', () => {
    const circuit = connect(
      withoutWire(presetCircuit(), 'wire-8'),
      'neck:return',
      'bridge:hot',
      'series',
    );
    expect(analyze(circuit).status).toBe('live');
    expect(analyze(circuit).activePickups).toEqual(['bridge']);
  });

  it('supports direct pickup to jack', () => {
    let circuit: Circuit = {
      ...blankCircuit(),
      parts: [createPart('pickup', 'pickup'), createPart('jack', 'jack', 1)],
    };
    circuit = connect(circuit, 'pickup:hot', 'jack:tip', 'hot');
    circuit = connect(circuit, 'pickup:return', 'jack:sleeve', 'ground');
    const result = analyze(circuit);
    expect(result.output).toBe(100);
    expect(result.wireLevels).toEqual({ hot: 1 });
    expect(result.groundWires).toEqual(['ground']);
  });

  it('does not mark a dead branch on a live net as contributing', () => {
    let circuit = update(presetCircuit(), 'selector', { position: 'neck' });
    circuit = {
      ...circuit,
      parts: [...circuit.parts, createPart('pickup', 'floating', 3)],
    };
    circuit = connect(circuit, 'volume:input', 'floating:hot', 'dead');
    const result = analyze(circuit);
    expect(result.status).toBe('live');
    expect(result.wireLevels.dead).toBeUndefined();
    expect(result.wireLevels['wire-1']).toBeUndefined();
  });

  it('handles absent pickups and output', () => {
    expect(analyze(blankCircuit()).status).toBe('silent');
    expect(analyze(removePart(presetCircuit(), 'jack')).output).toBe(0);
    expect(
      analyze(removePart(removePart(presetCircuit(), 'neck'), 'bridge')).output,
    ).toBe(0);
  });

  it('removes incident wires and refuses invalid or duplicate connections', () => {
    const circuit = removePart(presetCircuit(), 'neck');
    expect(
      circuit.wires.some((wire) => `${wire.from} ${wire.to}`.includes('neck:')),
    ).toBe(false);
    expect(connect(circuit, 'neck:hot', 'jack:tip', 'bad')).toBe(circuit);
    expect(connect(circuit, 'jack:tip', 'jack:tip', 'same')).toBe(circuit);
    expect(connect(circuit, 'selector:bridge', 'bridge:hot', 'duplicate')).toBe(
      circuit,
    );
  });

  it('bounds invalid data before analysis', () => {
    expect(
      analyze(update(presetCircuit(), 'volume', { value: NaN })).status,
    ).toBe('unavailable');
    expect(
      analyze({
        ...presetCircuit(),
        wires: Array(81).fill({ id: 'a', from: 'a', to: 'b' }),
      }).status,
    ).toBe('unavailable');
  });
});

describe('physical terminals and standard humbucker circuit', () => {
  it.each([
    ['neck', 1],
    ['both', 2],
    ['bridge', 3],
  ] as const)('closes isolated blade poles at %s', (position, contact) => {
    const blade = { ...createPart('blade', 'blade'), position };
    expect(terminals.blade).toHaveLength(8);
    expect(switchConnections(blade)).toEqual([
      ['blade:a-common', `blade:a${contact}`],
      ['blade:b-common', `blade:b${contact}`],
    ]);
  });

  it('scales offsets without moving the part anchor', () => {
    const circuit = modernPreset();
    const pickup = circuit.parts[0]!;
    const terminal = terminals.humbucker[0]!;
    expect(terminalPoints(circuit).get('neck:a-start')).toEqual({
      x: pickup.x + terminal.x * partScale,
      y: pickup.y + terminal.y * partScale,
    });
  });

  it.each([
    ['neck', ['neck']],
    ['both', ['neck', 'bridge']],
    ['bridge', ['bridge']],
  ] as const)(
    'lights both series coils of selected %s pickups',
    (position, active) => {
      const estimate = analyze(
        update(modernPreset(), 'selector', { position }),
      );
      expect(estimate.status).toBe('live');
      expect(estimate.activePickups).toEqual(active);
      expect(estimate.activeCoils).toEqual(
        Object.fromEntries(active.map((id) => [id, ['a', 'b']])),
      );
      expect(estimate.wireLevels['wire-0'] ?? 0).toBe(
        active.includes('neck' as never) ? 1 : 0,
      );
      expect(estimate.wireLevels['wire-1'] ?? 0).toBe(
        active.includes('bridge' as never) ? 1 : 0,
      );
    },
  );

  it('requires external jumpers for the middle blade position', () => {
    const estimate = analyze(
      withoutWire(withoutWire(modernPreset(), 'wire-10'), 'wire-11'),
    );
    expect(estimate.activePickups).toEqual([]);
    expect(estimate.output).toBe(0);
  });

  it('silences an open series link and recognizes an explicitly grounded split', () => {
    const open = analyze(withoutWire(modernPreset(), 'wire-13'));
    expect(open.activePickups).toEqual(['bridge']);
    expect(open.activeCoils.neck).toBeUndefined();
    expect(open.wireLevels['wire-0']).toBeUndefined();
    const split = analyze(
      connect(modernPreset(), 'neck:a-finish', 'jack:sleeve', 'split'),
    );
    expect(split.status).toBe('live');
    expect(split.activeCoils).toEqual({ neck: ['a'], bridge: ['a', 'b'] });
    expect(split.wireLevels['wire-0']).toBe(1);
  });

  it('never substitutes the grounded shield for a missing coil return', () => {
    const estimate = analyze(withoutWire(modernPreset(), 'wire-8'));
    expect(estimate.activePickups).toEqual(['bridge']);
    expect(estimate.groundWires).toContain('wire-15');
    expect(
      analyze(withoutWire(modernPreset(), 'wire-15')).activePickups,
    ).toEqual(['neck', 'bridge']);
    expect(
      analyze(
        connect(
          withoutWire(modernPreset(), 'wire-15'),
          'neck:shield',
          'neck:a-start',
          'shield-hot',
        ),
      ).status,
    ).toBe('unavailable');
  });

  it('keeps pot casings separate from resistive lugs', () => {
    const circuit = withoutWire(modernPreset(), 'wire-7');
    expect(analyze(circuit).status).toBe('unavailable');
    expect(
      analyze(connect(circuit, 'volume:ground', 'volume:casing', 'bond'))
        .status,
    ).toBe('live');
    expect(analyze(withoutWire(modernPreset(), 'wire-17')).output).toBe(100);
    expect(terminals.volume.map((terminal) => terminal.label)).toEqual([
      '3',
      '2 WIPER',
      '1',
      'CASE',
    ]);
    expect(terminals.tone.map((terminal) => terminal.label)).toEqual([
      '1',
      '2 WIPER',
      '3',
      'CASE',
    ]);
    expect(
      analyze(connect(modernPreset(), 'tone:unused', 'tone:wiper', 'strap'))
        .status,
    ).toBe('unavailable');
  });

  it('shows relative tone activity on the complete capacitor return, not unrelated grounds', () => {
    const circuit = update(modernPreset(), 'tone', { value: 0 });
    const warm = analyze(circuit);
    const bright = analyze(update(circuit, 'tone', { value: 10 }));
    expect(warm.toneDiversion).toBe(100);
    expect(bright.toneDiversion).toBe(0);
    expect(warm.toneWireLevels).toEqual({
      'wire-4': 1,
      'wire-5': 1,
      'wire-6': 1,
    });
    expect(warm.capacitorLevels).toEqual({ capacitor: 1 });
    expect(warm.wireLevels['wire-6']).toBeUndefined();
    expect(warm.output).toBe(bright.output);
    expect(
      analyze(update(circuit, 'volume', { value: 0 })).toneWireLevels,
    ).toEqual(warm.toneWireLevels);
    expect(
      analyze(update(circuit, 'capacitor', { value: 47 })).toneDiversion,
    ).toBe(warm.toneDiversion);
  });

  it('does not illuminate an incomplete tone path or a path without a source', () => {
    const circuit = update(modernPreset(), 'tone', { value: 0 });
    for (const id of ['wire-4', 'wire-5', 'wire-6']) {
      const estimate = analyze(withoutWire(circuit, id));
      expect(estimate.status).toBe('unavailable');
      expect(estimate.toneDiversion).toBeNull();
      expect(estimate.toneWireLevels).toEqual({});
      expect(estimate.capacitorLevels).toEqual({});
    }
    const silent = analyze(
      withoutWire(withoutWire(circuit, 'wire-8'), 'wire-9'),
    );
    expect(silent.toneDiversion).toBe(0);
    expect(silent.toneWireLevels).toEqual({});
    expect(silent.capacitorLevels).toEqual({});
  });
});

describe('single-coil preset and explicit signal return junctions', () => {
  it('uses the named standard two-single-coil layout with nominal Tele values', () => {
    const circuit = telePreset();
    expect(circuit.metadata.title).toBe(
      '2 single-coils, 3-way blade, 1 volume, 1 tone',
    );
    expect(circuit.metadata.permission).toBe('');
    expect(circuit.parts.map((part) => part.kind)).toEqual([
      'pickup',
      'pickup',
      'blade',
      'volume',
      'tone',
      'capacitor',
      'jack',
      'ground',
    ]);
    expect(
      circuit.parts
        .filter((part) => ['volume', 'tone'].includes(part.kind))
        .map((part) => part.resistanceKOhms),
    ).toEqual([250, 250]);
    expect(circuit.parts.find((part) => part.kind === 'capacitor')?.value).toBe(
      47,
    );
    expect(terminals.ground).toEqual([
      { name: 'common', label: 'GND', x: 24, y: 112 },
    ]);
    expect(
      circuit.wires
        .filter((wire) => wire.to === 'ground:common')
        .map((wire) => wire.from),
    ).toEqual([
      'capacitor:b',
      'volume:ground',
      'neck:return',
      'bridge:return',
      'volume:casing',
      'tone:casing',
    ]);
    expect(circuit.wires.filter((wire) => wire.to === 'jack:sleeve')).toEqual([
      { id: 'wire-15', from: 'ground:common', to: 'jack:sleeve' },
    ]);
  });

  it.each([
    ['neck', ['neck']],
    ['both', ['neck', 'bridge']],
    ['bridge', ['bridge']],
  ] as const)(
    'traces only selected %s pickup returns and shared output return',
    (position, active) => {
      const result = analyze(update(telePreset(), 'selector', { position }));
      expect(result.status).toBe('live');
      expect(result.output).toBe(100);
      expect(result.activePickups).toEqual(active);
      expect(result.activeCoils).toEqual({});
      expect(result.groundWireLevels).toEqual({
        ...Object.fromEntries(
          active.map((id) => [id === 'neck' ? 'wire-8' : 'wire-9', 1]),
        ),
        'wire-7': 1,
        'wire-15': 1,
      });
      expect(result.groundNodes).toEqual({
        ground: { isConnected: true, isActive: true },
      });
      expect(result.groundWires).toEqual([
        'wire-6',
        'wire-7',
        'wire-8',
        'wire-9',
        'wire-13',
        'wire-14',
        'wire-15',
      ]);
      for (const id of result.groundWires)
        expect(result.wireLevels[id]).toBeUndefined();
      expect(result.wireLevels['wire-0'] ?? 0).toBe(
        active.includes('neck' as never) ? 1 : 0,
      );
      expect(result.wireLevels['wire-1'] ?? 0).toBe(
        active.includes('bridge' as never) ? 1 : 0,
      );
    },
  );

  it('requires explicit external jumpers for the middle blade position', () => {
    expect(
      analyze(withoutWire(withoutWire(telePreset(), 'wire-10'), 'wire-11'))
        .activePickups,
    ).toEqual([]);
  });

  it.each([0, 5, 10])(
    'keeps return connectivity distinct from volume %s attenuation',
    (value) => {
      const result = analyze(update(telePreset(), 'volume', { value }));
      expect(result.output).toBe(value * 10);
      expect(result.groundWireLevels).toEqual(
        analyze(telePreset()).groundWireLevels,
      );
    },
  );

  it.each([0, 5, 10])(
    'traces tone %s through capacitor, junction and sleeve only',
    (value) => {
      const result = analyze(update(telePreset(), 'tone', { value }));
      const level = (10 - value) / 10;
      expect(result.toneWireLevels).toEqual({
        'wire-4': level,
        'wire-5': level,
        'wire-6': level,
        'wire-15': level,
      });
      expect(result.groundWireLevels['wire-6'] ?? 0).toBe(level > 0 ? 1 : 0);
      expect(result.groundWireLevels['wire-13']).toBeUndefined();
      expect(result.groundWireLevels['wire-14']).toBeUndefined();
    },
  );

  it('keeps shield stubs static but recognizes an explicitly shared casing segment', () => {
    const fixture = modernPreset();
    const result = analyze(fixture);
    for (const id of ['wire-15', 'wire-16', 'wire-17', 'wire-18']) {
      expect(result.groundWires).toContain(id);
      expect(result.groundWireLevels[id]).toBeUndefined();
    }
    const shared = connect(
      withoutWire(fixture, 'wire-8'),
      'neck:b-finish',
      'volume:casing',
      'shared-return',
    );
    expect(analyze(shared).groundWireLevels['wire-17']).toBe(1);
    expect(analyze(shared).groundWireLevels['shared-return']).toBe(1);
  });

  it('only activates a tone-only ground junction when the tone branch contributes', () => {
    const circuit = telePreset();
    circuit.wires = circuit.wires.map((wire) =>
      wire.to === 'ground:common' && wire.from !== 'capacitor:b'
        ? { ...wire, to: 'jack:sleeve' }
        : wire,
    );
    expect(analyze(circuit).groundNodes.ground).toEqual({
      isConnected: true,
      isActive: false,
    });
    const warm = analyze(update(circuit, 'tone', { value: 0 }));
    expect(warm.groundNodes.ground).toEqual({
      isConnected: true,
      isActive: true,
    });
    expect(warm.groundWireLevels['wire-15']).toBe(1);
    const stub = connect(
      { ...circuit, parts: [...circuit.parts, createPart('ground', 'stub')] },
      'ground:common',
      'stub:common',
      'stub-wire',
    );
    const result = analyze(update(stub, 'tone', { value: 0 }));
    expect(result.groundNodes.stub).toEqual({
      isConnected: true,
      isActive: false,
    });
    expect(result.groundWires).toContain('stub-wire');
    expect(result.groundWireLevels['stub-wire']).toBeUndefined();
  });

  it('does not choose a ground reference or invent activity for multiple output jacks', () => {
    const circuit = telePreset();
    const result = analyze({
      ...circuit,
      parts: [...circuit.parts, createPart('jack', 'extra-jack')],
    });
    expect(result.status).toBe('unavailable');
    expect(result.groundNodes.ground).toEqual({
      isConnected: null,
      isActive: false,
    });
    expect(result.groundWires).toEqual([]);
    expect(result.groundWireLevels).toEqual({});
  });

  it('does not turn a floating junction into global ground', () => {
    const circuit = withoutWire(telePreset(), 'wire-15');
    const result = analyze(circuit);
    expect(result.status).toBe('unavailable');
    expect(result.groundNodes.ground).toEqual({
      isConnected: false,
      isActive: false,
    });
    expect(result.groundWires).toEqual([]);
    expect(result.groundWireLevels).toEqual({});
    expect(result.toneWireLevels).toEqual({});
    expect(result.wireLevels).toEqual({});
    const second = {
      ...circuit,
      parts: [...circuit.parts, createPart('ground', 'second')],
    };
    const linked = connect(
      second,
      'second:common',
      'jack:sleeve',
      'second-sleeve',
    );
    expect(analyze(linked).groundNodes).toEqual({
      ground: { isConnected: false, isActive: false },
      second: { isConnected: true, isActive: false },
    });
    const joined = analyze(
      connect(linked, 'ground:common', 'second:common', 'join'),
    );
    expect(joined.status).toBe('live');
    expect(joined.groundNodes.second).toEqual({
      isConnected: true,
      isActive: true,
    });
    expect(joined.groundWireLevels.join).toBe(1);
    expect(joined.groundWireLevels['second-sleeve']).toBe(1);
  });

  it('shows connected but idle nodes for shorts, unknown wiring and absent sources', () => {
    for (const circuit of [
      connect(telePreset(), 'jack:tip', 'ground:common', 'short'),
      connect(telePreset(), 'volume:input', 'volume:wiper', 'bypass'),
      withoutWire(withoutWire(telePreset(), 'wire-0'), 'wire-1'),
      removePart(removePart(telePreset(), 'neck'), 'bridge'),
    ]) {
      const result = analyze(circuit);
      expect(result.groundNodes.ground).toEqual({
        isConnected: true,
        isActive: false,
      });
      expect(result.groundWireLevels).toEqual({});
      expect(result.toneWireLevels).toEqual({});
      expect(result.wireLevels).toEqual({});
    }
    expect(
      analyze(removePart(telePreset(), 'jack')).groundNodes.ground,
    ).toEqual({ isConnected: false, isActive: false });
  });

  it('removes all ground junction incident wires without inventing replacements', () => {
    const circuit = removePart(telePreset(), 'ground');
    expect(
      circuit.wires.some((wire) =>
        `${wire.from} ${wire.to}`.includes('ground:common'),
      ),
    ).toBe(false);
    expect(analyze(circuit).status).toBe('unavailable');
    expect(connect(circuit, 'ground:common', 'jack:sleeve', 'invalid')).toBe(
      circuit,
    );
  });
});
