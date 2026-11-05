import type { Circuit, Wire } from '../circuit/model';
import { wirePath, type Point } from './wireRouting';

export interface Segment {
  from: Point;
  to: Point;
  axis: 'x' | 'y';
  fixed: number;
  low: number;
  high: number;
  offset: number;
}

export const wireOrder = (a: Wire, b: Wire) =>
  [a.from, a.to]
    .sort()
    .join('|')
    .localeCompare([b.from, b.to].sort().join('|')) || a.id.localeCompare(b.id);

export function segments(points: readonly Point[]): Segment[] {
  let offset = 0;
  return points.slice(1).flatMap((to, index) => {
    const from = points[index]!;
    const axis = from.y === to.y ? 'x' : 'y';
    const length = Math.abs(to[axis] - from[axis]);
    const segment: Segment = {
      from,
      to,
      axis,
      fixed: axis === 'x' ? from.y : from.x,
      low: Math.min(from[axis], to[axis]),
      high: Math.max(from[axis], to[axis]),
      offset,
    };
    offset += length;
    return length ? [segment] : [];
  });
}

function sharedPoints(a: Wire, b: Wire, points: ReadonlyMap<string, Point>) {
  return [
    ...new Set([a.from, a.to].filter((id) => id === b.from || id === b.to)),
  ].map((id) => points.get(id)!);
}

export function remoteOverlap(
  a: Segment,
  b: Segment,
  common: readonly Point[],
) {
  const low = Math.max(a.low, b.low);
  const high = Math.min(a.high, b.high);
  if (high <= low) return 0;
  let overlap = high - low;
  let previousLow = 0;
  let previousHigh = 0;
  const cross = a.axis === 'x' ? 'y' : 'x';
  for (const point of common) {
    const distance = Math.max(
      Math.abs(a.fixed - point[cross]),
      Math.abs(b.fixed - point[cross]),
    );
    if (distance >= 40) continue;
    const half = Math.sqrt(40 ** 2 - distance ** 2);
    const start = Math.max(low, point[a.axis] - half);
    const end = Math.min(high, point[a.axis] + half);
    if (end <= start) continue;
    overlap -= end - start;
    // Two wires can share at most two endpoints; subtract their disk union.
    overlap += Math.max(
      0,
      Math.min(end, previousHigh) - Math.max(start, previousLow),
    );
    previousLow = start;
    previousHigh = end;
  }
  return Math.max(0, overlap);
}

export interface RoutingWork {
  candidates: number;
  occupancyChecks: number;
}

// Coordinate buckets bound occupancy work to nearby parallel lanes, not every
// accepted segment for every corridor candidate. Only real shared pins exempt a stub.
export class LaneOccupancy {
  private buckets = new Map<string, { segment: Segment; wire: Wire }[]>();
  private common = new Map<string, Point[]>();
  private coordinates = { x: new Set<number>(), y: new Set<number>() };
  private scoringWire = '';
  private scores = new Map<string, number>();
  constructor(
    private points: ReadonlyMap<string, Point>,
    private work?: RoutingWork,
  ) {}
  add(wire: Wire, route: readonly Point[]) {
    for (const segment of segments(route)) {
      this.coordinates[segment.axis].add(segment.fixed);
      const key = `${segment.axis}:${Math.floor(segment.fixed / 18)}`;
      const bucket = this.buckets.get(key) ?? [];
      bucket.push({ segment, wire });
      this.buckets.set(key, bucket);
    }
  }
  tracks(axis: 'x' | 'y') {
    return [...this.coordinates[axis]].flatMap((fixed) => [
      fixed - 18,
      fixed + 18,
    ]);
  }
  score(wire: Wire, route: readonly Point[]) {
    if (this.scoringWire !== wire.id) {
      this.scoringWire = wire.id;
      this.scores.clear();
    }
    let score = 0;
    for (const a of segments(route)) {
      const segmentKey = `${a.axis}:${a.fixed}:${a.low}:${a.high}`;
      const cached = this.scores.get(segmentKey);
      if (cached !== undefined) {
        score += cached;
        continue;
      }
      let segmentScore = 0;
      const bucket = Math.floor(a.fixed / 18);
      for (let index = bucket - 1; index <= bucket + 1; index++) {
        for (const { segment: b, wire: other } of this.buckets.get(
          `${a.axis}:${index}`,
        ) ?? []) {
          if (this.work) this.work.occupancyChecks++;
          const spacing = Math.abs(a.fixed - b.fixed);
          if (spacing >= 18 || a.high <= b.low || b.high <= a.low) continue;
          const key = `${wire.id}|${other.id}`;
          let common = this.common.get(key);
          if (!common) {
            common = sharedPoints(wire, other, this.points);
            this.common.set(key, common);
          }
          const overlap = remoteOverlap(a, b, common);
          segmentScore +=
            overlap * (spacing < 0.001 ? 40 : (5 * (18 - spacing)) / 18);
        }
      }
      this.scores.set(segmentKey, segmentScore);
      score += segmentScore;
    }
    return score;
  }
}

export interface WireDrawing {
  path: string;
  visible: Segment[];
  gaps: [number, number][];
}

function mergedIntervals(intervals: [number, number][]) {
  const merged: [number, number][] = [];
  for (const [low, high] of intervals.sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && low <= last[1]) last[1] = Math.max(last[1], high);
    else merged.push([low, high]);
  }
  return merged;
}

function pointAt(segment: Segment, distance: number): Point {
  return {
    ...segment.from,
    [segment.axis]:
      segment.from[segment.axis] +
      Math.sign(segment.to[segment.axis] - segment.from[segment.axis]) *
        distance,
  };
}

// Arc-length cuts also handle a nonterminal corner touching another segment.
// Reusing the same cut path for every activity layer (instead of a background
// outline) leaves the real canvas grid visible through the gaps.
export function wireDrawings(
  circuit: Circuit,
  routes: ReadonlyMap<string, Point[]>,
) {
  const wires = [...circuit.wires].sort(wireOrder);
  const pins = new Map<string, Point>();
  const lines = new Map(
    wires.map((wire) => {
      const route = routes.get(wire.id)!;
      pins.set(wire.from, route[0]!);
      pins.set(wire.to, route.at(-1)!);
      return [wire.id, segments(route)];
    }),
  );
  const cuts = new Map(
    wires.map((wire) => [wire.id, [] as [number, number][]]),
  );
  for (let i = 0; i < wires.length; i++) {
    const lower = wires[i]!;
    const lowerLines = lines.get(lower.id)!;
    const length = lowerLines.reduce((sum, s) => sum + s.high - s.low, 0);
    for (const upper of wires.slice(i + 1)) {
      const common = sharedPoints(lower, upper, pins);
      for (
        let segmentIndex = 0;
        segmentIndex < lowerLines.length;
        segmentIndex++
      ) {
        const a = lowerLines[segmentIndex]!;
        for (const b of lines.get(upper.id)!) {
          if (a.axis === b.axis) continue;
          const horizontal = a.axis === 'x' ? a : b;
          const vertical = a.axis === 'y' ? a : b;
          const point = { x: vertical.fixed, y: horizontal.fixed };
          if (
            point.x < horizontal.low ||
            point.x > horizontal.high ||
            point.y < vertical.low ||
            point.y > vertical.high
          )
            continue;
          if (
            common.some(
              (pin) => Math.hypot(pin.x - point.x, pin.y - point.y) <= 40,
            )
          )
            continue;
          // Never erase a physical endpoint, even if an arbitrary custom layout
          // places another wire there. Connectivity still belongs to the graph.
          if (
            [lower.from, lower.to, upper.from, upper.to].some((id) => {
              const pin = pins.get(id)!;
              return Math.hypot(pin.x - point.x, pin.y - point.y) < 12;
            })
          )
            continue;
          const distance = a.offset + Math.abs(point[a.axis] - a.from[a.axis]);
          const neighbor =
            point[a.axis] === a.from[a.axis]
              ? lowerLines[segmentIndex - 1]
              : point[a.axis] === a.to[a.axis]
                ? lowerLines[segmentIndex + 1]
                : undefined;
          const half = Math.min(
            5,
            (a.high - a.low) / 3,
            neighbor ? (neighbor.high - neighbor.low) / 3 : 5,
          );
          cuts
            .get(lower.id)!
            .push([
              Math.max(8, distance - half),
              Math.min(length - 8, distance + half),
            ]);
        }
      }
    }
  }
  return new Map(
    wires.map((wire) => {
      const gaps = mergedIntervals(cuts.get(wire.id)!);
      const visible: Segment[] = [];
      let firstGap = 0;
      for (const segment of lines.get(wire.id)!) {
        const end = segment.offset + segment.high - segment.low;
        const append = (low: number, high: number) => {
          if (high <= low) return;
          const from = pointAt(segment, low - segment.offset);
          const to = pointAt(segment, high - segment.offset);
          visible.push({
            ...segment,
            from,
            to,
            low: Math.min(from[segment.axis], to[segment.axis]),
            high: Math.max(from[segment.axis], to[segment.axis]),
          });
        };
        let start = segment.offset;
        while (firstGap < gaps.length && gaps[firstGap]![1] <= start)
          firstGap++;
        for (
          let index = firstGap;
          index < gaps.length && gaps[index]![0] < end;
          index++
        ) {
          const [low, high] = gaps[index]!;
          append(start, Math.min(low, end));
          start = Math.max(start, high);
        }
        append(start, end);
      }
      return [
        wire.id,
        {
          gaps,
          visible,
          path: gaps.length
            ? visible
                .map(({ from, to }) => `M${from.x} ${from.y} L${to.x} ${to.y}`)
                .join(' ')
            : wirePath(routes.get(wire.id)!),
        } satisfies WireDrawing,
      ];
    }),
  );
}

export function closestVisibleWire(
  point: Point,
  drawings: ReadonlyMap<string, WireDrawing>,
  radius = 8,
  routes?: ReadonlyMap<string, Point[]>,
) {
  let best: string | null = null;
  let distance = radius;
  // Map iteration is stable paint order. The upper wire owns exact ties.
  for (const [id, drawing] of drawings)
    for (const segment of drawing.visible) {
      const along = Math.max(
        segment.low,
        Math.min(segment.high, point[segment.axis]),
      );
      const cross = segment.axis === 'x' ? point.y : point.x;
      const candidate = Math.hypot(
        point[segment.axis] - along,
        cross - segment.fixed,
      );
      if (candidate <= distance + 1e-6) {
        best = id;
        distance = candidate;
      }
    }
  if (!best && routes) {
    for (const id of drawings.keys())
      for (const segment of segments(routes.get(id)!)) {
        const along = Math.max(
          segment.low,
          Math.min(segment.high, point[segment.axis]),
        );
        const cross = segment.axis === 'x' ? point.y : point.x;
        const candidate = Math.hypot(
          point[segment.axis] - along,
          cross - segment.fixed,
        );
        if (candidate <= distance + 1e-6) {
          best = id;
          distance = candidate;
        }
      }
  }
  return best;
}
