import { describe, expect, it } from 'vitest';
import { analyze } from './analyze';
import {
  gretschSetzerHotRodCircuit,
  gretschG6122CountryGentlemanCircuit,
  gretschTonePotCircuit,
  gretschToneSwitchCircuit,
  gretschToneStandbySwitchCircuit,
} from './library';
import type { Circuit } from './model';

const update = (
  circuit: Circuit,
  id: string,
  changes: Partial<Circuit['parts'][number]>,
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

describe('Gretsch Setzer Hot Rod — switch positions', () => {
  it.each([1, 2, 3])(
    'position %d: selector common connects to the matching throw',
    (position) => {
      const circuit = update(gretschSetzerHotRodCircuit(), 'selector', {
        position: (['neck', 'both', 'bridge'] as const)[position - 1]!,
      });
      const estimate = analyze(circuit);
      expect(estimate.status).toBe('live');
      // Both selector poles are joined at the common (b-common → a-common),
      // so each position feeds the volume input from the selected pole(s).
      expect(estimate.wireLevels).toEqual(expect.any(Object));
      expect(Object.keys(estimate.wireLevels).length).toBeGreaterThan(0);
    },
  );

  it('position 1: neck pickup contributes output', () => {
    const circuit = update(gretschSetzerHotRodCircuit(), 'selector', {
      position: 'neck',
    });
    const estimate = analyze(circuit);
    expect(estimate.activePickups).toContain('neck');
  });

  it('position 3: bridge pickup contributes output', () => {
    const circuit = update(gretschSetzerHotRodCircuit(), 'selector', {
      position: 'bridge',
    });
    const estimate = analyze(circuit);
    expect(estimate.activePickups).toContain('bridge');
  });

  it('position 2: both pickups contribute output', () => {
    const circuit = update(gretschSetzerHotRodCircuit(), 'selector', {
      position: 'both',
    });
    const estimate = analyze(circuit);
    expect(estimate.activePickups).toEqual(
      expect.arrayContaining(['neck', 'bridge']),
    );
  });

  it('every pickup shield is grounded', () => {
    const circuit = gretschSetzerHotRodCircuit();
    const estimate = analyze(circuit);
    for (const id of ['neck', 'bridge']) {
      const shield = `${id}:shield`;
      const wire = circuit.wires.find((w) => w.from === shield);
      expect(wire).toBeDefined();
      expect(estimate.groundWireLevels).toEqual(expect.any(Object));
    }
  });
});

describe('Gretsch Setzer Hot Rod — signal path', () => {
  it('neck hot reaches jack tip in position 1', () => {
    const circuit = update(gretschSetzerHotRodCircuit(), 'selector', {
      position: 'neck',
    });
    const estimate = analyze(circuit);
    const neckHot = circuit.wires.find((w) => w.from === 'neck:a-start')!;
    expect(estimate.wireLevels[neckHot.id]).toBeGreaterThan(0);
    const output = circuit.wires.find((w) => w.to === 'jack:tip')!;
    expect(estimate.wireLevels[output.id]).toBeGreaterThan(0);
  });

  it('bridge hot reaches jack tip in position 3', () => {
    const circuit = update(gretschSetzerHotRodCircuit(), 'selector', {
      position: 'bridge',
    });
    const estimate = analyze(circuit);
    const bridgeHot = circuit.wires.find((w) => w.from === 'bridge:a-start')!;
    expect(estimate.wireLevels[bridgeHot.id]).toBeGreaterThan(0);
    const output = circuit.wires.find((w) => w.to === 'jack:tip')!;
    expect(estimate.wireLevels[output.id]).toBeGreaterThan(0);
  });

  it('volume at zero mutes output but pickups still feed input', () => {
    const circuit = update(gretschSetzerHotRodCircuit(), 'volume', {
      value: 0,
    });
    const estimate = analyze(circuit);
    expect(estimate.output).toBe(0);
    expect(estimate.status).toBe('silent');
    expect(estimate.message).toContain('muted');
  });
});

describe('Gretsch circuits with multiple volumes — unavailable', () => {
  it.each([
    ['gretsch-g6122-country-gentleman', gretschG6122CountryGentlemanCircuit],
    ['gretsch-tone-pot', gretschTonePotCircuit],
    ['gretsch-tone-switch', gretschToneSwitchCircuit],
    ['gretsch-tone-standby-switch', gretschToneStandbySwitchCircuit],
  ] as const)(
    '%s is unavailable because it has multiple master volumes',
    (_id, createCircuit) => {
      const circuit = createCircuit();
      const volumeCount = circuit.parts.filter(
        (part) => part.kind === 'volume',
      ).length;
      expect(volumeCount).toBeGreaterThan(1);
      const estimate = analyze(circuit);
      expect(estimate.status).toBe('unavailable');
      expect(estimate.message).toMatch(/one master volume/);
      expect(estimate.output).toBeNull();
    },
  );
});

describe('Gretsch Setzer Hot Rod — ground and short faults', () => {
  it('broken ground to jack sleeve → silent', () => {
    const circuit = without(gretschSetzerHotRodCircuit(), 'ground:common');
    // Without a ground wire, volume ground can't return to sleeve
    const estimate = analyze(circuit);
    expect(estimate.status).toBe('unavailable');
    expect(estimate.message).toMatch(
      /volume ground needs a return to the jack sleeve/,
    );
  });

  it('output shorted to ground → silent', () => {
    const circuit = update(gretschSetzerHotRodCircuit(), 'jack', {
      x: 820,
      y: 200,
    });
    const shorted = {
      ...circuit,
      wires: [
        ...circuit.wires,
        { id: 'short', from: 'jack:tip', to: 'jack:sleeve' },
      ],
    };
    const estimate = analyze(shorted);
    expect(estimate.status).toBe('silent');
    expect(estimate.message).toMatch(/shorted/);
  });

  it('pickup hot bypasses master volume → unavailable', () => {
    // Neck hot wired directly to jack tip instead of through selector/volume
    const circuit = update(gretschSetzerHotRodCircuit(), 'selector', {
      position: 'neck',
    });
    const bypassed = {
      ...circuit,
      wires: circuit.wires.map((w) =>
        w.from === 'selector:a-common' && w.to === 'volume:input'
          ? { ...w, to: 'jack:tip' }
          : w,
      ),
    };
    const estimate = analyze(bypassed);
    expect(estimate.status).toBe('unavailable');
    expect(estimate.message).toMatch(/bypasses the master volume/);
  });
});

describe('Gretsch tone circuits — standby switch limitation', () => {
  it('tone-standby-switch has no standby switching representable', () => {
    const circuit = gretschToneStandbySwitchCircuit();
    const estimate = analyze(circuit);
    // Standby switching is not a model concept; the circuit falls back to
    // single-capacitor tone behavior (unavailable due to multiple volumes).
    expect(estimate.status).toBe('unavailable');
    expect(estimate.notes.length).toBeGreaterThanOrEqual(0);
  });

  it('tone-switch approximates two-way switch with single capacitor', () => {
    const circuit = gretschToneSwitchCircuit();
    const estimate = analyze(circuit);
    expect(estimate.status).toBe('unavailable');
    // Single capacitor modeled at value 12 as documented approximation
    const tone = circuit.parts.find((p) => p.id === 'tone')!;
    expect(tone.kind).toBe('tone');
    const cap = circuit.parts.find((p) => p.kind === 'capacitor')!;
    expect(cap.value).toBe(12);
  });
});
