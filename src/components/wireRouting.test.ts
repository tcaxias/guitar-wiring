import { describe, expect, it } from 'vitest';
import {
  board,
  createPart,
  partScale,
  presetCircuit,
  terminalPoints,
  terminals,
  terminalsFor,
  type Circuit,
} from '../circuit/model';
import { humbuckerCircuit } from '../circuit/testFixtures';
import {
  fourWayTeleCircuit,
  splitHumbuckerCircuit,
  varitoneCircuit,
} from '../circuit/library';
import { analyze as analyzeCircuit } from '../circuit/analyze';
import {
  clampPosition,
  labelScale,
  materialScale,
  terminalHitRadius,
  partTitleY,
} from './partGeometry';
import { wirePath, wireRoutes, type Point } from './wireRouting';

const distanceToSegment = (point: Point, from: Point, to: Point) =>
  Math.hypot(
    point.x -
      Math.max(
        Math.min(from.x, to.x),
        Math.min(Math.max(from.x, to.x), point.x),
      ),
    point.y -
      Math.max(
        Math.min(from.y, to.y),
        Math.min(Math.max(from.y, to.y), point.y),
      ),
  );

const visibleCircuit = (circuit: Circuit) => ({
  ...circuit,
  parts: circuit.parts.map((part) => ({ ...part, ...clampPosition(part) })),
});

describe('compact presentation geometry', () => {
  it('escapes the push-pull center lug before the switch housing and keeps pot jumpers out of side-bank shortcuts', () => {
    const circuit = visibleCircuit(splitHumbuckerCircuit());
    const pot = circuit.parts.find((part) => part.kind === 'push-pull-volume')!;
    circuit.wires.push({
      id: 'pot-jumper',
      from: 'volume:input',
      to: 'volume:ground',
    });
    const routes = wireRoutes(circuit);
    const output = circuit.wires.find((wire) => wire.from === 'volume:wiper')!;
    const route = routes.get(output.id)!;
    expect(route[1]!.y).toBeLessThan(pot.y + 154 * partScale);
    expect(route[2]!.x).toBeGreaterThan(pot.x + 180 * partScale);
    expect(route[2]!.y).toBe(route[1]!.y);
    const jumper = routes.get('pot-jumper')!;
    expect(jumper[1]!.y).toBeGreaterThan(jumper[0]!.y);
    expect(jumper[1]!.x).toBe(jumper[0]!.x);
  });
  it('keeps new parts and optional cover terminals separated and routes inside the board at saved edges', () => {
    for (const kind of [
      'push-pull-volume',
      'push-pull-tone',
      'blade4',
      'varitone',
      'pickup',
    ] as const) {
      const part = {
        ...createPart(kind, 'new'),
        hasSeparateShield: kind === 'pickup',
      };
      const bank = terminalsFor(part);
      for (const [index, terminal] of bank.entries())
        for (const other of bank.slice(index + 1))
          expect(
            Math.hypot(terminal.x - other.x, terminal.y - other.y) * partScale,
          ).toBeGreaterThan(22);
    }
    for (const fixture of [
      fourWayTeleCircuit,
      splitHumbuckerCircuit,
      varitoneCircuit,
    ]) {
      const original = fixture();
      for (const [x, y] of [
        [0, 0],
        [900, 525],
      ]) {
        const circuit = visibleCircuit({
          ...original,
          parts: original.parts.map((part) => ({ ...part, x: x!, y: y! })),
        });
        const points = terminalPoints(circuit);
        const routes = wireRoutes(circuit);
        for (const wire of circuit.wires) {
          const route = routes.get(wire.id)!;
          expect(route[0]).toEqual(points.get(wire.from));
          expect(route.at(-1)).toEqual(points.get(wire.to));
          for (const point of route) {
            expect(point.x).toBeGreaterThanOrEqual(8);
            expect(point.x).toBeLessThanOrEqual(board.width - 8);
            expect(point.y).toBeGreaterThanOrEqual(8);
            expect(point.y).toBeLessThanOrEqual(board.height - 8);
          }
        }
      }
    }
  });
  it('shrinks material shapes by about 20% without shrinking labels or overlapping hit targets', () => {
    expect(partScale / 0.78).toBeCloseTo(0.795, 2);
    expect(materialScale).toBeCloseTo(0.80645);
    expect(materialScale * partScale).toBeCloseTo(0.5);
    expect(partScale * labelScale).toBeCloseTo(0.78);
    expect(terminalHitRadius * partScale * 2).toBe(22);
    for (const bank of Object.values(terminals))
      for (const [index, terminal] of bank.entries())
        for (const other of bank.slice(index + 1))
          expect(
            Math.hypot(terminal.x - other.x, terminal.y - other.y) * partScale,
          ).toBeGreaterThan(22);
  });
  it('keeps eight stable logical IDs in two outward-facing side banks', () => {
    expect(terminals.blade.map((terminal) => terminal.name)).toEqual([
      'a-common',
      'a1',
      'a2',
      'a3',
      'b-common',
      'b1',
      'b2',
      'b3',
    ]);
    for (const [index, terminal] of terminals.blade.entries()) {
      expect(terminal.x).toBe(index < 4 ? 0 : 180);
      expect(terminal.exit).toBe(index < 4 ? 'left' : 'right');
      expect(terminal.y).toBe(20 + (index % 4) * 40);
    }
  });
});

describe('stacked factory routing', () => {
  it('bounds dense overlapping custom layouts to finite short candidate paths without changing data', () => {
    const circuit = presetCircuit();
    for (let index = 8; index < 24; index++)
      circuit.parts.push({
        ...createPart('pickup', `dense-${index}`),
        x: 60 + (index % 6) * 160,
        y: 180 + Math.floor((index - 8) / 6) * 120,
      });
    const pins = [...terminalPoints(circuit).keys()];
    for (let index = 1; circuit.wires.length < 80; index++)
      circuit.wires.push({
        id: `dense-wire-${index}`,
        from: pins[0]!,
        to: pins[(index % (pins.length - 1)) + 1]!,
      });
    const saved = JSON.stringify(circuit);
    const visible = visibleCircuit(circuit);
    const work = { candidates: 0, occupancyChecks: 0 };
    const routes = wireRoutes(visible, [], { clear: true, work });
    expect(work.candidates).toBeLessThanOrEqual(80 * 750);
    expect(work.occupancyChecks).toBeLessThan(500_000);
    expect(routes.size).toBe(80);
    for (const route of routes.values()) {
      expect(route.length).toBeLessThanOrEqual(10);
      for (let index = 1; index < route.length; index++)
        expect(
          route[index]!.x === route[index - 1]!.x ||
            route[index]!.y === route[index - 1]!.y,
        ).toBe(true);
      for (const point of route) {
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
        expect(point.x).toBeGreaterThanOrEqual(8);
        expect(point.x).toBeLessThanOrEqual(board.width - 8);
        expect(point.y).toBeGreaterThanOrEqual(8);
        expect(point.y).toBeLessThanOrEqual(board.height - 8);
      }
    }
    expect(JSON.stringify(circuit)).toBe(saved);
  });
  for (const factory of [
    presetCircuit,
    fourWayTeleCircuit,
    splitHumbuckerCircuit,
    varitoneCircuit,
  ]) {
    it(`${factory.name} clears every unrelated terminal and part envelope in every blade position`, () => {
      for (const position of [1, 2, 3, 4]) {
        const circuit = visibleCircuit(factory());
        const blade = circuit.parts.find((part) => part.id === 'selector')!;
        blade.value = position;
        blade.position =
          position === 1 ? 'neck' : position === 2 ? 'both' : 'bridge';
        const routes = wireRoutes(circuit);
        const pins = terminalPoints(circuit);
        for (const wire of circuit.wires) {
          const route = routes.get(wire.id)!;
          for (let index = 1; index < route.length; index++) {
            const from = route[index - 1]!;
            const to = route[index]!;
            if (index > 1 && index < route.length - 1)
              for (const id of [wire.from, wire.to])
                expect(
                  distanceToSegment(pins.get(id)!, from, to),
                  `${wire.id} doubles back through ${id}`,
                ).toBeGreaterThan(10);
            for (const [id, point] of pins) {
              if (id === wire.from || id === wire.to) continue;
              expect(
                distanceToSegment(point, from, to),
                `${wire.id} crosses ${id}`,
              ).toBeGreaterThan(10);
            }
            for (const part of circuit.parts) {
              if (
                [wire.from, wire.to].some((id) => id.startsWith(`${part.id}:`))
              )
                continue;
              const left = part.x + 18 * partScale;
              const right = part.x + 162 * partScale;
              const top = part.y;
              const bottom =
                part.y +
                (part.kind === 'push-pull-volume' ? 254 : 100) * partScale;
              const crosses =
                Math.max(from.x, to.x) > left &&
                Math.min(from.x, to.x) < right &&
                Math.max(from.y, to.y) > top &&
                Math.min(from.y, to.y) < bottom;
              expect(crosses, `${wire.id} crosses ${part.id} housing`).toBe(
                false,
              );
            }
          }
        }
      }
    });
  }
});

for (const [name, fixture] of [
  ['Tele', presetCircuit],
  ['HH', humbuckerCircuit],
] as const) {
  describe(`${name} wire routes`, () => {
    it('matches exact terminals and stays deterministic, orthogonal and independent of switch position', () => {
      const circuit = visibleCircuit(fixture());
      const points = terminalPoints(circuit);
      const routes = wireRoutes(circuit, analyzeCircuit(circuit).groundWires);
      expect(wireRoutes(circuit, analyzeCircuit(circuit).groundWires)).toEqual(
        routes,
      );
      expect(
        wireRoutes(
          { ...circuit, wires: [...circuit.wires].reverse() },
          analyzeCircuit(circuit).groundWires,
        ),
      ).toEqual(routes);
      for (const wire of circuit.wires) {
        const route = routes.get(wire.id)!;
        expect(route[0]).toEqual(points.get(wire.from));
        expect(route.at(-1)).toEqual(points.get(wire.to));
        expect(wirePath(route)).toMatch(/^M/);
        for (let index = 1; index < route.length; index++)
          expect(
            route[index]!.x === route[index - 1]!.x ||
              route[index]!.y === route[index - 1]!.y,
          ).toBe(true);
      }
      for (const position of ['neck', 'both', 'bridge'] as const) {
        const moved = {
          ...circuit,
          parts: circuit.parts.map((part) => ({ ...part, position })),
        };
        expect(wireRoutes(moved, analyzeCircuit(moved).groundWires)).toEqual(
          routes,
        );
      }
    });
    it('keeps external blade routes out of unrelated lug neighborhoods and label bounds', () => {
      const circuit = visibleCircuit(fixture());
      const routes = wireRoutes(circuit);
      const points = terminalPoints(circuit);
      for (const wire of circuit.wires.filter(
        (wire) =>
          wire.from.startsWith('selector:') || wire.to.startsWith('selector:'),
      )) {
        const route = routes.get(wire.id)!;
        for (const terminal of terminals.blade) {
          const id = `selector:${terminal.name}`;
          if (id === wire.from || id === wire.to) continue;
          const point = points.get(id)!;
          for (let index = 1; index < route.length; index++) {
            expect(
              distanceToSegment(point, route[index - 1]!, route[index]!),
            ).toBeGreaterThan(10);
            const labelCenter = { x: point.x, y: point.y - 12 };
            expect(
              distanceToSegment(labelCenter, route[index - 1]!, route[index]!),
            ).toBeGreaterThan(9);
          }
        }
      }
    });
    it('uses short external same-bank loops and wraps the common jumper outside the body', () => {
      const circuit = visibleCircuit(fixture());
      const routes = wireRoutes(circuit);
      const blade = circuit.parts.find((part) => part.kind === 'blade')!;
      for (const wire of circuit.wires.filter(
        (wire) =>
          wire.from.startsWith('selector:') && wire.to.startsWith('selector:'),
      )) {
        const route = routes.get(wire.id)!;
        const sameBank =
          wire.from.split(':')[1]![0] === wire.to.split(':')[1]![0];
        if (sameBank) {
          expect(route).toHaveLength(4);
          const length = route
            .slice(1)
            .reduce(
              (sum, point, index) =>
                sum +
                Math.hypot(
                  point.x - route[index]!.x,
                  point.y - route[index]!.y,
                ),
              0,
            );
          expect(length).toBeLessThan(70);
        } else {
          expect(Math.max(...route.map((point) => point.y))).toBeCloseTo(
            blade.y + 20 * partScale,
          );
          expect(Math.min(...route.map((point) => point.y))).toBe(blade.y - 16);
          expect(
            blade.y - 16 - (blade.y + partTitleY(blade) * partScale),
          ).toBeGreaterThan(16);
        }
        for (let index = 1; index < route.length; index++) {
          const from = route[index - 1]!;
          const to = route[index]!;
          if (from.x === to.x)
            expect(
              from.x <= blade.x || from.x >= blade.x + 180 * partScale,
            ).toBe(true);
          else
            expect(
              from.y <= blade.y - 12 ||
                Math.max(from.x, to.x) <= blade.x ||
                Math.min(from.x, to.x) >= blade.x + 180 * partScale,
            ).toBe(true);
        }
      }
    });
    it('separates short bank jumpers from external leads by at least 12 board units', () => {
      const circuit = visibleCircuit(fixture());
      const routes = wireRoutes(circuit);
      for (const wire of circuit.wires.filter(
        (wire) =>
          wire.from.startsWith('selector:') !== wire.to.startsWith('selector:'),
      )) {
        const route = routes.get(wire.id)!;
        const end = wire.from.startsWith('selector:')
          ? route[0]!
          : route.at(-1)!;
        const escape = wire.from.startsWith('selector:')
          ? route[1]!
          : route.at(-2)!;
        expect(Math.abs(escape.x - end.x) - 18).toBeGreaterThanOrEqual(12);
      }
    });
    it('bounds tracks at old saved edges without rewriting the circuit', () => {
      for (const [x, y] of [
        [0, 0],
        [900, 525],
        [390, 220],
      ]) {
        const original = fixture();
        original.parts.find((part) => part.kind === 'blade')!.x = x!;
        original.parts.find((part) => part.kind === 'blade')!.y = y!;
        const saved = JSON.stringify(original);
        const circuit = visibleCircuit(original);
        for (const route of wireRoutes(
          circuit,
          analyzeCircuit(circuit).groundWires,
        ).values())
          for (const point of route) {
            expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(
              true,
            );
            expect(point.x).toBeGreaterThanOrEqual(8);
            expect(point.x).toBeLessThanOrEqual(board.width - 8);
            expect(point.y).toBeGreaterThanOrEqual(8);
            expect(point.y).toBeLessThanOrEqual(board.height - 8);
          }
        expect(JSON.stringify(original)).toBe(saved);
      }
    });
  });
}
