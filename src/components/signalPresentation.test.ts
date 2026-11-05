import { describe, expect, it } from 'vitest';
import { analyze } from '../circuit/analyze';
import {
  exampleLibrary,
  fourWayTeleCircuit,
  splitHumbuckerCircuit,
  varitoneCircuit,
} from '../circuit/library';
import { createPart, presetCircuit, type Circuit } from '../circuit/model';
import { signalFlowDirections, signalWireRoles } from './signalPresentation';
import { groundPresentation } from './groundPresentation';

const reversed = (circuit: Circuit): Circuit => ({
  ...circuit,
  wires: circuit.wires.map((wire) => ({
    ...wire,
    from: wire.to,
    to: wire.from,
  })),
});
const roleAt = (circuit: Circuit, terminal: string) =>
  circuit.wires
    .filter((wire) => [wire.from, wire.to].includes(terminal))
    .map((wire) => signalWireRoles(circuit)[wire.id]);

describe('stable physical lead roles', () => {
  for (const example of exampleLibrary)
    it(`${example.id}: controls and serialization do not redefine roles`, () => {
      const circuit = example.createCircuit();
      const baseline = signalWireRoles(circuit);
      for (const position of [1, 2, 3, 4])
        for (const isPulled of [false, true])
          for (const value of [0, 5, 10]) {
            const changed = {
              ...circuit,
              parts: circuit.parts.map((part) => ({
                ...part,
                position:
                  part.kind === 'blade'
                    ? (['neck', 'both', 'bridge'] as const)[
                        Math.min(position, 3) - 1
                      ]!
                    : part.position,
                value:
                  part.kind === 'blade4'
                    ? position
                    : part.kind === 'blade'
                      ? Math.min(position, 3)
                      : part.id === 'tone' || part.id === 'volume'
                        ? value
                        : part.value,
                ...(part.kind === 'push-pull-volume' ? { isPulled } : {}),
              })),
            };
            expect(signalWireRoles(changed)).toEqual(baseline);
            expect(signalWireRoles(reversed(changed))).toEqual(baseline);
          }
      for (const id of groundPresentation(circuit).groundWires)
        expect(baseline[id]).toBe('ground');
      // Both master volumes may join at the tip; every lead there is HOT.
      expect(new Set(roleAt(circuit, 'jack:tip'))).toEqual(new Set(['hot']));
      // Tone-less arrangements (e.g. single-humbucker-1v) have no tone leads.
      if (circuit.parts.some((part) => part.id === 'tone')) {
        expect(roleAt(circuit, 'tone:input')).toEqual(['tone']);
        expect(roleAt(circuit, 'tone:wiper')).toEqual(['tone']);
      }
      expect(
        roleAt(
          circuit,
          circuit.parts[0]!.kind === 'humbucker' ? 'neck:a-start' : 'neck:hot',
        ),
      ).toEqual(['hot']);
      if (circuit.parts.some((part) => part.id === 'bridge'))
        expect(
          roleAt(
            circuit,
            circuit.parts[0]!.kind === 'humbucker'
              ? 'bridge:a-start'
              : 'bridge:hot',
          ),
        ).toEqual(['hot']);
    });

  it('keeps switched RETURN and its series jumper muted green in all four positions', () => {
    const circuit = fourWayTeleCircuit();
    for (const position of [1, 2, 3, 4]) {
      circuit.parts.find((part) => part.id === 'selector')!.value = position;
      const roles = signalWireRoles(circuit);
      expect(roles['wire-3']).toBe('return');
      expect(roles['wire-6']).toBe('return');
      expect(roles['wire-0']).toBe('hot');
      expect(roles['wire-2']).toBe('hot');
    }
  });

  it('reserves RETURN for four-conductor coil series links, even while split', () => {
    const circuit = splitHumbuckerCircuit();
    for (const isPulled of [false, true]) {
      circuit.parts.find((part) => part.id === 'volume')!.isPulled = isPulled;
      expect(roleAt(circuit, 'neck:a-finish')).toEqual(['return', 'return']);
      expect(roleAt(circuit, 'bridge:a-finish')).toEqual(['return', 'return']);
    }
  });

  it('propagates through wire-only hops but not coils, pots or unconnected poles', () => {
    const circuit = fourWayTeleCircuit();
    circuit.parts.push(
      createPart('ground', 'hop'),
      createPart('blade', 'unused'),
    );
    circuit.wires.find((wire) => wire.id === 'wire-2')!.to = 'hop:common';
    circuit.wires.push(
      { id: 'hop-hot', from: 'hop:common', to: 'bridge:hot' },
      { id: 'unknown', from: 'unused:a1', to: 'unused:a2' },
    );
    expect(signalWireRoles(circuit)['wire-2']).toBe('hot');
    expect(signalWireRoles(circuit)['hop-hot']).toBe('hot');
    expect(signalWireRoles(circuit)['unknown']).toBe('unknown');
    expect(roleAt(circuit, 'neck:return')).toEqual(['return']);
  });

  it('uses RETURN deterministically on a direct interpickup series link', () => {
    const circuit = fourWayTeleCircuit();
    circuit.wires = circuit.wires.filter(
      (wire) => !['wire-2', 'wire-3'].includes(wire.id),
    );
    circuit.wires.push({ id: 'series', from: 'bridge:hot', to: 'neck:return' });
    expect(signalWireRoles(circuit).series).toBe('return');
    expect(signalWireRoles(reversed(circuit)).series).toBe('return');
  });

  it('prioritizes permanent ground even on a short without muting warnings', () => {
    const circuit = presetCircuit();
    circuit.wires.push({ id: 'short', from: 'jack:tip', to: 'jack:sleeve' });
    expect(roleAt(circuit, 'jack:tip')).toEqual(['ground', 'ground']);
    expect(analyze(circuit).message).toContain('shorted');
    expect(signalFlowDirections(circuit, analyze(circuit))).toEqual({});
  });

  it('keeps LC purple even in bypass and at every notch setting', () => {
    const circuit = varitoneCircuit();
    for (const value of [1, 2, 3, 4, 5, 6]) {
      circuit.parts.find((part) => part.id === 'varitone')!.value = value;
      expect(signalWireRoles(circuit)['varitone-signal']).toBe('lc');
      expect(signalWireRoles(circuit)['varitone-ground']).toBe('ground');
    }
  });

  for (const filter of ['tone', 'lc'] as const)
    for (const hasHop of [false, true])
      it(`${filter} relocated to a switch common preserves the HOT backbone${hasHop ? ' through a multiwire spur' : ''}`, () => {
        const circuit = varitoneCircuit();
        const feed = circuit.wires.find((wire) =>
          filter === 'lc'
            ? wire.id === 'varitone-signal'
            : wire.to === 'tone:input',
        )!;
        feed.from = 'selector:a-common';
        if (hasHop) {
          circuit.parts.push(createPart('ground', 'filter-hop'));
          feed.from = 'filter-hop:common';
          circuit.wires.push({
            id: 'filter-hop-wire',
            from: 'selector:a-common',
            to: 'filter-hop:common',
          });
        }
        for (const value of [1, 6])
          for (const tone of [0, 10])
            for (const position of [1, 2, 3]) {
              circuit.parts.find((part) => part.id === 'varitone')!.value =
                value;
              circuit.parts.find((part) => part.id === 'tone')!.value = tone;
              circuit.parts.find((part) => part.id === 'selector')!.position = (
                ['neck', 'both', 'bridge'] as const
              )[position - 1]!;
              const estimate = analyze(circuit);
              expect(estimate.status).toBe('live');
              expect(estimate.wireLevels['wire-2']).toBe(1);
              const roles = signalWireRoles(circuit);
              expect(roles['wire-2']).toBe('hot');
              expect(roles['wire-12']).toBe('hot');
              expect(roles[feed.id]).toBe(filter);
              if (hasHop) expect(roles['filter-hop-wire']).toBe(filter);
              expect(
                signalWireRoles({
                  ...reversed(circuit),
                  parts: [...circuit.parts].reverse(),
                  wires: reversed(circuit).wires.reverse(),
                }),
              ).toEqual(roles);
            }
      });

  it('keeps separate filter spurs at the same custom signal junction order independent', () => {
    const circuit = varitoneCircuit();
    circuit.parts.push(createPart('ground', 'tap'));
    circuit.wires.find((wire) => wire.id === 'wire-2')!.to = 'tap:common';
    circuit.wires.push({
      id: 'tap-output',
      from: 'tap:common',
      to: 'volume:input',
    });
    circuit.wires.find((wire) => wire.id === 'wire-4')!.from = 'tap:common';
    circuit.wires.find((wire) => wire.id === 'varitone-signal')!.from =
      'tap:common';
    const roles = signalWireRoles(circuit);
    expect(analyze(circuit).status).toBe('live');
    expect(roles['wire-2']).toBe('hot');
    expect(roles['tap-output']).toBe('hot');
    expect(roles['wire-12']).toBe('hot');
    expect(roles['wire-4']).toBe('tone');
    expect(roles['varitone-signal']).toBe('lc');
    expect(
      signalWireRoles({
        ...reversed(circuit),
        parts: [...circuit.parts].reverse(),
        wires: reversed(circuit).wires.reverse(),
      }),
    ).toEqual(roles);
  });

  it('stops at a switch common even when it has only two external wires', () => {
    for (const filter of ['tone', 'lc']) {
      const circuit = varitoneCircuit();
      circuit.wires = circuit.wires.filter((wire) => wire.id !== 'wire-12');
      circuit.parts.find((part) => part.id === 'selector')!.position = 'neck';
      const feed = circuit.wires.find((wire) =>
        filter === 'lc' ? wire.id === 'varitone-signal' : wire.id === 'wire-4',
      )!;
      feed.from = 'selector:a-common';
      expect(analyze(circuit).status).toBe('live');
      expect(signalWireRoles(circuit)['wire-2']).toBe('hot');
      expect(signalWireRoles(circuit)[feed.id]).toBe(filter);
    }
  });

  it('preserves HOT on a shared backbone that uses the tone input itself as a junction', () => {
    const circuit = varitoneCircuit();
    circuit.wires.find((wire) => wire.id === 'wire-2')!.to = 'tone:input';
    circuit.wires.find((wire) => wire.id === 'wire-4')!.from = 'tone:input';
    circuit.wires.find((wire) => wire.id === 'wire-4')!.to = 'volume:input';
    expect(analyze(circuit).status).toBe('live');
    const roles = signalWireRoles(circuit);
    expect(roles['wire-2']).toBe('hot');
    expect(roles['wire-4']).toBe('hot');
    expect(roles['wire-12']).toBe('hot');
    expect(roles['varitone-signal']).toBe('lc');
    expect(signalWireRoles(reversed(circuit))).toEqual(roles);
  });
});

describe('outputward educational flow', () => {
  for (const example of exampleLibrary)
    it(`${example.id}: every marked factory path has an endpoint-order-independent direction`, () => {
      const circuit = example.createCircuit();
      const selector = circuit.parts.find((part) => part.id === 'selector');
      const volume = circuit.parts.find((part) => part.id === 'volume')!;
      for (const position of [1, 2, 3, 4])
        for (const value of [0, 5, 10])
          for (const isPulled of [false, true]) {
            if (selector) {
              selector.value =
                example.id === 'tele-four-way'
                  ? position
                  : Math.min(position, 3);
              selector.position = (['neck', 'both', 'bridge'] as const)[
                Math.min(position, 3) - 1
              ]!;
            }
            volume.value = value;
            if (example.id === 'split-humbuckers')
              circuit.parts.find((part) => part.id === 'volume')!.isPulled =
                isPulled;
            const estimate = analyze(circuit);
            const original = structuredClone(estimate);
            const directions = signalFlowDirections(circuit, estimate);
            const reverseDirections = signalFlowDirections(
              reversed(circuit),
              analyze(reversed(circuit)),
            );
            expect(estimate).toEqual(original);
            // Only live estimates mark outputward paths; unsupported
            // arrangements (multiple master volumes) deliberately estimate
            // as unavailable and mark nothing.
            if (estimate.status === 'live') {
              expect(Object.keys(directions).sort()).toEqual(
                Object.keys(estimate.wireLevels)
                  .filter((id) => estimate.wireLevels[id]! > 0)
                  .sort(),
              );
              for (const [id, direction] of Object.entries(directions)) {
                expect(direction, `${id} position ${position}`).not.toBe(
                  'static',
                );
                expect(reverseDirections[id]).toBe(
                  direction === 'forward' ? 'reverse' : 'forward',
                );
              }
              const output = circuit.wires.find(
                (wire) => wire.to === 'jack:tip',
              )!;
              expect(directions[output.id]).toBe(
                value === 0 ? undefined : 'forward',
              );
            }
          }
    });

  it('flows bridge HOT through the muted green series RETURN into the neck, then to output', () => {
    const circuit = fourWayTeleCircuit();
    circuit.parts.find((part) => part.id === 'selector')!.value = 4;
    const directions = signalFlowDirections(circuit, analyze(circuit));
    expect(directions['wire-2']).toBe('reverse');
    expect(directions['wire-6']).toBe('forward');
    expect(directions['wire-3']).toBe('forward');
    expect(directions['wire-0']).toBe('forward');
  });

  it('does not animate idle pickup HOT, unused throws or floating RETURN', () => {
    const circuit = fourWayTeleCircuit();
    const directions = signalFlowDirections(circuit, analyze(circuit));
    expect(directions['wire-2']).toBeUndefined();
    expect(directions['wire-3']).toBeUndefined();
    expect(directions['wire-6']).toBeUndefined();
    circuit.wires = circuit.wires.filter((wire) => wire.id !== 'wire-3');
    expect(signalFlowDirections(circuit, analyze(circuit))).toEqual({});
  });

  for (const fault of ['return', 'output', 'short', 'unavailable'])
    it(`does not invent flow for ${fault} faults`, () => {
      const circuit = presetCircuit();
      if (fault === 'return')
        circuit.wires = circuit.wires.filter(
          (wire) => wire.to !== 'jack:sleeve',
        );
      if (fault === 'output')
        circuit.wires = circuit.wires.filter((wire) => wire.to !== 'jack:tip');
      if (fault === 'short')
        circuit.wires.push({
          id: 'short',
          from: 'jack:tip',
          to: 'jack:sleeve',
        });
      if (fault === 'unavailable')
        circuit.parts.push(createPart('volume', 'extra'));
      expect(signalFlowDirections(circuit, analyze(circuit))).toEqual({});
    });

  it('never invents a direction for an ambiguous marked cycle', () => {
    const circuit = presetCircuit();
    circuit.parts.push(createPart('ground', 'hop'));
    circuit.wires.push(
      { id: 'alternate-a', from: 'volume:wiper', to: 'hop:common' },
      { id: 'alternate-b', from: 'hop:common', to: 'jack:tip' },
    );
    const estimate = analyze(circuit);
    // Synthetic shared-flow input exercises conservative handling if a future
    // analyzer marks both alternatives; today's BFS marks only one path.
    estimate.wireLevels['alternate-a'] = 1;
    estimate.wireLevels['alternate-b'] = 1;
    const directions = signalFlowDirections(circuit, estimate);
    expect(directions['alternate-a']).toBe('static');
    expect(directions['alternate-b']).toBe('static');
    expect(directions['wire-3']).toBe('static');
  });
});
