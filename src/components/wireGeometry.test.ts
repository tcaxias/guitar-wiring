import { describe, expect, it } from 'vitest';
import {
  presetCircuit,
  terminalPoints,
  type Circuit,
  type Wire,
} from '../circuit/model';
import {
  fourWayTeleCircuit,
  splitHumbuckerCircuit,
  varitoneCircuit,
} from '../circuit/library';
import { analyze } from '../circuit/analyze';
import { clampPosition } from './partGeometry';
import { wireRoutes, type Point } from './wireRouting';
import {
  closestVisibleWire,
  LaneOccupancy,
  remoteOverlap,
  segments,
  wireDrawings,
} from './wireGeometry';

const lower: Wire = { id: 'lower', from: 'a', to: 'b' };
const upper: Wire = { id: 'upper', from: 'c', to: 'd' };
const fixture = (a: Point[], b: Point[], wires = [lower, upper]) => {
  const circuit = { ...presetCircuit(), wires };
  const routes = new Map([
    [wires[0]!.id, a],
    [wires[1]!.id, b],
  ]);
  return { circuit, routes, drawings: wireDrawings(circuit, routes) };
};
const horizontal = [
  { x: 0, y: 50 },
  { x: 100, y: 50 },
];
const vertical = [
  { x: 50, y: 0 },
  { x: 50, y: 100 },
];

describe('crossing presentation, never electrical connections', () => {
  it('cuts the lower proper crossing and gives the visible upper wire exact ownership', () => {
    const { drawings, routes } = fixture(horizontal, vertical);
    expect(drawings.get('lower')!.gaps).toEqual([[45, 55]]);
    expect(drawings.get('upper')!.gaps).toEqual([]);
    expect(closestVisibleWire({ x: 50, y: 50 }, drawings, 8, routes)).toBe(
      'upper',
    );
    expect(closestVisibleWire({ x: 56, y: 50 }, drawings, 8, routes)).toBe(
      'lower',
    );
    expect(closestVisibleWire({ x: 44, y: 50 }, drawings)).toBe('lower');
    expect(closestVisibleWire({ x: 150, y: 150 }, drawings)).toBeNull();
  });
  it('cuts a nonterminal bend-to-segment contact across the corner', () => {
    const { drawings } = fixture(
      [
        { x: 0, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 100 },
      ],
      [
        { x: 20, y: 50 },
        { x: 80, y: 50 },
      ],
    );
    expect(drawings.get('lower')!.gaps).toEqual([[45, 55]]);
    expect(drawings.get('lower')!.visible).toHaveLength(2);
  });
  it('protects terminals and near-endpoint crossings', () => {
    const { drawings } = fixture(horizontal, [
      { x: 5, y: 0 },
      { x: 5, y: 100 },
    ]);
    expect(drawings.get('lower')!.gaps).toEqual([]);
  });
  it('limits a corner gap to the adjacent short leg as well as the crossed leg', () => {
    const { drawings } = fixture(
      [
        { x: 0, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 56 },
        { x: 100, y: 56 },
      ],
      [
        { x: 50, y: 0 },
        { x: 50, y: 100 },
      ],
    );
    expect(drawings.get('lower')!.gaps).toEqual([
      [48, 52],
      [54, 58],
    ]);
  });
  it('keeps only the local actual shared endpoint stub intact, not remote same-net crossings', () => {
    const wires = [lower, { ...upper, from: 'a' }];
    const a = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const b = [
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 150, y: 50 },
    ];
    const { drawings } = fixture(a, b, wires);
    expect(drawings.get('lower')!.gaps).toEqual([[145, 155]]);
  });
  it('merges adjacent cuts and bounds holes on short segments', () => {
    const { drawings } = fixture(horizontal, [
      { x: 48, y: 0 },
      { x: 48, y: 100 },
      { x: 52, y: 100 },
      { x: 52, y: 0 },
    ]);
    expect(drawings.get('lower')!.gaps).toEqual([[43, 57]]);
    const short = fixture(
      [
        { x: 0, y: 40 },
        { x: 50, y: 40 },
        { x: 50, y: 46 },
        { x: 100, y: 46 },
      ],
      [
        { x: 0, y: 43 },
        { x: 100, y: 43 },
      ],
    );
    expect(short.drawings.get('lower')!.gaps).toEqual([[51, 55]]);
  });
  it('has stable paint priority for reversed input arrays without mutating graph data', () => {
    const { circuit, routes, drawings } = fixture(horizontal, vertical);
    const saved = JSON.stringify(circuit);
    expect(
      wireDrawings({ ...circuit, wires: [...circuit.wires].reverse() }, routes),
    ).toEqual(drawings);
    expect(JSON.stringify(circuit)).toBe(saved);
  });
  it('uses centerlines only when no visible segment qualifies', () => {
    const { routes, drawings } = fixture(horizontal, vertical);
    drawings.get('lower')!.visible = [];
    expect(closestVisibleWire({ x: 30, y: 50 }, drawings, 8, routes)).toBe(
      'lower',
    );
    expect(closestVisibleWire({ x: 50, y: 50 }, drawings, 8, routes)).toBe(
      'upper',
    );
  });
});

describe('bounded parallel-lane occupancy', () => {
  it('penalizes exact and nearby remote runs, but not separated tracks', () => {
    const occupancy = new LaneOccupancy(new Map());
    occupancy.add(lower, horizontal);
    const exact = occupancy.score(upper, horizontal);
    const nearby = occupancy.score(upper, [
      { x: 0, y: 60 },
      { x: 100, y: 60 },
    ]);
    expect(exact).toBeGreaterThan(nearby);
    expect(nearby).toBeGreaterThan(0);
    expect(
      occupancy.score(upper, [
        { x: 0, y: 68 },
        { x: 100, y: 68 },
      ]),
    ).toBe(0);
  });
  it('exempts only radius 40 around identical endpoint IDs, not matching positions or net names', () => {
    const pins = new Map([['a', { x: 0, y: 50 }]]);
    const occupancy = new LaneOccupancy(pins);
    occupancy.add(lower, horizontal);
    expect(
      occupancy.score({ ...upper, from: 'a' }, [
        { x: 0, y: 50 },
        { x: 40, y: 50 },
      ]),
    ).toBe(0);
    expect(occupancy.score({ ...upper, from: 'a' }, horizontal)).toBe(60 * 40);
    expect(occupancy.score({ ...upper, id: 'different' }, horizontal)).toBe(
      100 * 40,
    );
  });
  for (const factory of [
    presetCircuit,
    splitHumbuckerCircuit,
    fourWayTeleCircuit,
    varitoneCircuit,
  ]) {
    it(`${factory.name} has no significant remote exact overlap and stable control-independent routes`, () => {
      const original = factory();
      const circuit: Circuit = {
        ...original,
        parts: original.parts.map((part) => ({
          ...part,
          ...clampPosition(part),
        })),
      };
      const pins = terminalPoints(circuit);
      const work = { candidates: 0, occupancyChecks: 0 };
      const routes = wireRoutes(circuit, [], { clear: true, work });
      for (const route of routes.values())
        for (let index = 2; index < route.length; index++) {
          const [a, b, c] = route.slice(index - 2, index + 1) as [
            Point,
            Point,
            Point,
          ];
          expect(
            (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y),
          ).toBe(false);
        }
      expect(work.candidates).toBeLessThanOrEqual(circuit.wires.length * 2500);
      const lines = [...routes].map(([id, points]) => ({
        wire: circuit.wires.find((wire) => wire.id === id)!,
        segments: segments(points),
      }));
      let total = 0;
      for (let i = 0; i < lines.length; i++)
        for (const b of lines.slice(i + 1)) {
          const a = lines[i]!;
          const common = [a.wire.from, a.wire.to]
            .filter((id) => id === b.wire.from || id === b.wire.to)
            .map((id) => pins.get(id)!);
          for (const s of a.segments)
            for (const t of b.segments)
              if (s.axis === t.axis && Math.abs(s.fixed - t.fixed) < 1e-6) {
                const length = remoteOverlap(s, t, common);
                expect(length).toBeLessThan(3);
                total += length;
              }
        }
      expect(total).toBeLessThan(4);
      const drawings = wireDrawings(circuit, routes);
      expect(
        wireRoutes({ ...circuit, wires: [...circuit.wires].reverse() }),
      ).toEqual(routes);
      for (const value of [1, 2, 3, 4, 5, 6])
        for (const isPulled of [false, true]) {
          const changed = {
            ...circuit,
            parts: circuit.parts.map((part) => ({
              ...part,
              value,
              isPulled,
              position: (value === 1
                ? 'neck'
                : value === 2
                  ? 'both'
                  : 'bridge') as 'neck' | 'both' | 'bridge',
            })),
          };
          const next = wireRoutes(changed, analyze(changed).groundWires);
          expect(next).toEqual(routes);
          expect(wireDrawings(changed, next)).toEqual(drawings);
        }
    });
  }
});
