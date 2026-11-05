import {
  board,
  isBladePart,
  isPushPullPart,
  partScale,
  terminalId,
  terminalPoints,
  terminalsFor,
  type Circuit,
  type Part,
  type Terminal,
  type Wire,
} from '../circuit/model';
import { partStateY, partTitleY } from './partGeometry';
import { LaneOccupancy, wireOrder, type RoutingWork } from './wireGeometry';

export interface Point {
  x: number;
  y: number;
}
interface Endpoint {
  part: Part;
  terminal: Terminal;
  point: Point;
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const intersects = (from: Point, to: Point, bounds: Bounds) =>
  Math.max(from.x, to.x) > bounds.left &&
  Math.min(from.x, to.x) < bounds.right &&
  Math.max(from.y, to.y) > bounds.top &&
  Math.min(from.y, to.y) < bounds.bottom;

const compact = (route: Point[]) =>
  route.filter(
    (point, index) =>
      !index ||
      point.x !== route[index - 1]!.x ||
      point.y !== route[index - 1]!.y,
  );

const simplify = (route: Point[]) => {
  const result: Point[] = [];
  for (const point of compact(route)) {
    while (result.length > 1) {
      const a = result.at(-2)!;
      const b = result.at(-1)!;
      if (!(
        (a.x === b.x && b.x === point.x) ||
        (a.y === b.y && b.y === point.y)
      ))
        break;
      result.pop();
    }
    result.push(point);
  }
  return compact(result);
};

// Finite orthogonal corridors keep stacked parts clear without a global search.
// Overlapping custom layouts remain best-effort; neither data nor pins move.
function corridorRoute(
  start: Point,
  end: Point,
  obstacles: Bounds[],
  corridors: Bounds[],
  lane: number,
  occupancy?: LaneOccupancy,
  wire?: Wire,
  work?: RoutingWork,
  useLaneTracks = true,
  trackLimit = 24,
) {
  const isBlocked = obstacles.some(
    (bounds) =>
      intersects(start, start, bounds) || intersects(end, end, bounds),
  );
  const tracks = (
    values: number[],
    start: number,
    end: number,
    maximum: number,
  ) =>
    [...new Set(values)]
      .filter((value) => value >= 8 && value <= maximum - 8)
      .sort(
        (a, b) =>
          Math.min(Math.abs(a - start), Math.abs(a - end)) -
            Math.min(Math.abs(b - start), Math.abs(b - end)) || a - b,
      )
      .slice(0, isBlocked ? 6 : trackLimit);
  const xs = tracks(
    [
      start.x,
      end.x,
      ...(useLaneTracks && !(isBlocked && trackLimit < 24)
        ? (occupancy?.tracks('y') ?? [])
        : []),
      ...corridors.flatMap((b) => [b.left - 8, b.right + 8]),
      16,
      board.width - 16,
    ],
    start.x,
    end.x,
    board.width,
  );
  const ys = tracks(
    [
      start.y,
      end.y,
      lane,
      ...(useLaneTracks && !(isBlocked && trackLimit < 24)
        ? (occupancy?.tracks('x') ?? [])
        : []),
      ...corridors.flatMap((b) => [b.top - 8, b.bottom + 8]),
      16,
      board.height - 16,
    ],
    start.y,
    end.y,
    board.height,
  );
  let best = [start, { x: start.x, y: lane }, { x: end.x, y: lane }, end];
  let bestScore = Infinity;
  let bestHits = Infinity;
  let hasClearRoute = false;
  const obstaclesByLine = new Map<string, Bounds[]>();
  const lineObstacles = (a: Point, b: Point) => {
    const horizontal = a.y === b.y;
    const coordinate = horizontal ? a.y : a.x;
    const key = `${horizontal ? 'x' : 'y'}:${coordinate}`;
    let bounds = obstaclesByLine.get(key);
    if (!bounds) {
      bounds = obstacles.filter((bound) =>
        horizontal
          ? coordinate > bound.top && coordinate < bound.bottom
          : coordinate > bound.left && coordinate < bound.right,
      );
      obstaclesByLine.set(key, bounds);
    }
    return bounds;
  };
  const consider = (points: Point[]) => {
    if (work) work.candidates++;
    let score = points.length * 3;
    let hits = 0;
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1]!;
      const b = points[index]!;
      if (a.x !== b.x && a.y !== b.y) return;
      score += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      for (const obstacle of lineObstacles(a, b))
        if (intersects(a, b, obstacle)) hits++;
      if (
        occupancy
          ? hits > bestHits ||
            (hits === bestHits && score + hits * 100_000 >= bestScore)
          : score + hits * 100_000 >= bestScore
      )
        return;
    }
    score += hits * 100_000;
    if (occupancy && wire) score += occupancy.score(wire, points);
    // Lane separation never buys a crossing through a part or terminal. Keep
    // obstacle count lexicographically first even for crowded custom layouts.
    if (
      occupancy
        ? hits < bestHits || (hits === bestHits && score < bestScore)
        : score < bestScore
    ) {
      bestScore = score;
      bestHits = hits;
      best = points;
      hasClearRoute = hits === 0;
    }
  };
  for (const x of xs)
    consider([start, { x, y: start.y }, { x, y: end.y }, end]);
  for (const y of ys)
    consider([start, { x: start.x, y }, { x: end.x, y }, end]);
  if (
    (!hasClearRoute ||
      (occupancy && wire && occupancy.score(wire, best) > 0)) &&
    !isBlocked
  ) {
    // At most two extra corners, only when simple corridors are obstructed.
    for (const x of xs)
      for (const y of ys) {
        consider([start, { x, y: start.y }, { x, y }, { x: end.x, y }, end]);
        consider([start, { x: start.x, y }, { x, y }, { x, y: end.y }, end]);
      }
  }
  if (!hasClearRoute && occupancy && !isBlocked && useLaneTracks) {
    // One bounded retry without added tracks prevents occupancy offsets from
    // crowding out the only corridor around an unrelated terminal bank.
    const fallback = corridorRoute(
      start,
      end,
      obstacles,
      corridors,
      lane,
      occupancy,
      wire,
      work,
      false,
      trackLimit,
    );
    consider(fallback);
  }
  if (
    occupancy &&
    wire &&
    useLaneTracks &&
    !(isBlocked && trackLimit < 24) &&
    occupancy.score(wire, best) > 0
  ) {
    // A single local repair of the chosen corridor can separate its last run
    // from a shared ground fanout without a global maze search or perimeter lap.
    const original = compact(best);
    for (let index = 1; index < original.length; index++) {
      const a = original[index - 1]!;
      const b = original[index]!;
      const axis = a.y === b.y ? 'x' : 'y';
      const cross = axis === 'x' ? 'y' : 'x';
      const length = Math.abs(b[axis] - a[axis]);
      if (length < 40) continue;
      const direction = Math.sign(b[axis] - a[axis]);
      for (const offset of [-18, 18, -36, 36]) {
        for (const stub of [18, 36, -18, -36]) {
          if (length <= stub * 2) continue;
          const from =
            index === 1 ? { ...a, [axis]: a[axis] + direction * stub } : a;
          const to =
            index === original.length - 1
              ? { ...b, [axis]: b[axis] - direction * stub }
              : b;
          const candidate = compact([
            ...original.slice(0, index - 1),
            ...(index === 1 ? [a, from] : []),
            { ...from, [cross]: from[cross] + offset },
            { ...to, [cross]: to[cross] + offset },
            ...(index === original.length - 1 ? [to, b] : []),
            ...original.slice(index + 1),
          ]);
          if (
            candidate.length <= 6 &&
            candidate.every(
              (point) =>
                point.x >= 8 &&
                point.x <= board.width - 8 &&
                point.y >= 8 &&
                point.y <= board.height - 8,
            )
          )
            consider(candidate);
        }
      }
    }
  }
  return compact(best);
}

export function wireRoutes(
  circuit: Circuit,
  groundWires: readonly string[] = [],
  options: { clear?: boolean; work?: RoutingWork } = { clear: true },
) {
  const points = terminalPoints(circuit);
  const occupancy = options.clear
    ? new LaneOccupancy(points, options.work)
    : undefined;
  const endpoints = new Map<string, Endpoint>();
  for (const part of circuit.parts)
    for (const terminal of terminalsFor(part)) {
      const id = terminalId(part, terminal.name);
      endpoints.set(id, { part, terminal, point: points.get(id)! });
    }
  const bankChannels = new Map<string, number>();
  const bodies = circuit.parts.flatMap((part) => [
    {
      part,
      left: part.x + 18 * partScale,
      right: part.x + 162 * partScale,
      top: part.y,
      bottom: part.y + (isBladePart(part) ? 100 : 98) * partScale,
    },
    ...(isPushPullPart(part)
      ? [
          {
            part,
            left: part.x + 30 * partScale,
            right: part.x + 150 * partScale,
            top: part.y + 154 * partScale,
            bottom: part.y + 254 * partScale,
          },
        ]
      : []),
  ]);
  // Endpoint order, not wire-array order, assigns the bounded external tracks.
  const wires = [...circuit.wires].sort(wireOrder);
  const escape = (endpoint: Endpoint, isLocal: boolean) => {
    const direction = endpoint.terminal.exit ?? 'down';
    const bank = `${endpoint.part.id}:${direction}`;
    const channel = bankChannels.get(bank) ?? 0;
    if (!isLocal) bankChannels.set(bank, channel + 1);
    // The center pot lug must leave sideways before the lower switch housing.
    if (isPushPullPart(endpoint.part) && endpoint.terminal.name === 'wiper')
      return {
        x: endpoint.part.x + 180 * partScale + 42 + (channel % 2) * 12,
        y: endpoint.point.y + 18,
      };
    const distance =
      isBladePart(endpoint.part) ||
      (isPushPullPart(endpoint.part) && direction !== 'down')
        ? isLocal
          ? 18
          : 42 + (channel % 2) * 12
        : 18 + (channel % 3) * 4;
    return {
      x:
        endpoint.point.x +
        (direction === 'left'
          ? -distance
          : direction === 'right'
            ? distance
            : 0),
      y: endpoint.point.y + (direction === 'down' ? distance : 0),
    };
  };
  // Physical wires, not switch/knob-dependent analysis, determine lane hints.
  const physicalGround = new Set(
    circuit.parts.flatMap((part) =>
      part.kind === 'ground'
        ? terminalsFor(part).map((terminal) => terminalId(part, terminal.name))
        : part.kind === 'jack'
          ? [terminalId(part, 'sleeve')]
          : [],
    ),
  );
  if (options.clear) {
    for (let pass = 0; pass < circuit.wires.length; pass++) {
      let changed = false;
      for (const wire of wires)
        if (physicalGround.has(wire.from) || physicalGround.has(wire.to)) {
          if (!physicalGround.has(wire.from) || !physicalGround.has(wire.to))
            changed = true;
          physicalGround.add(wire.from);
          physicalGround.add(wire.to);
        }
      if (!changed) break;
    }
  }
  return new Map(
    wires.map((wire, index) => {
      const from = endpoints.get(wire.from)!;
      const to = endpoints.get(wire.to)!;
      const isLocal =
        from.part.id === to.part.id &&
        (isBladePart(from.part) ||
          (isPushPullPart(from.part) &&
            from.terminal.name.startsWith('switch-') &&
            to.terminal.name.startsWith('switch-')));
      const start = escape(from, isLocal);
      const end = escape(to, isLocal);
      let route: Point[];
      if (isLocal && from.terminal.exit === to.terminal.exit) {
        const x =
          from.terminal.exit === 'left'
            ? Math.min(start.x, end.x)
            : Math.max(start.x, end.x);
        route = [
          from.point,
          { x, y: from.point.y },
          { x, y: to.point.y },
          to.point,
        ];
      } else if (
        isLocal &&
        isBladePart(from.part) &&
        from.terminal.name.endsWith('-common') &&
        to.terminal.name.endsWith('-common')
      ) {
        // The commons bridge above the lever, between it and the raised title.
        const top = from.part.y - 16;
        route = [
          from.point,
          start,
          { x: start.x, y: top },
          { x: end.x, y: top },
          end,
          to.point,
        ];
      } else {
        const lane = Math.min(
          board.height - 44,
          (
            options.clear
              ? physicalGround.has(wire.from)
              : groundWires.includes(wire.id)
          )
            ? 550 + (index % 7) * 10
            : Math.max(
                from.part.y + partStateY(from.part) * partScale,
                to.part.y + partStateY(to.part) * partScale,
              ) +
                22 +
                (index % 7) * 7,
        );
        const corridors = bodies.map(({ part, ...bounds }) =>
          part.id === from.part.id || part.id === to.part.id
            ? bounds
            : {
                left: part.x - 24,
                right: part.x + 180 * partScale + 24,
                top: part.y - (isBladePart(part) ? 42 : 22),
                bottom: part.y + partStateY(part) * partScale + 4,
              },
        );
        const obstacles: Bounds[] = [
          ...corridors,
          ...(options.clear
            ? [from.part, to.part].filter(isBladePart).map((part) => ({
                left: part.x + 90 * partScale - 72,
                right: part.x + 90 * partScale + 72,
                top: part.y + partTitleY(part) * partScale - 11,
                bottom: part.y + partTitleY(part) * partScale + 4,
              }))
            : []),
          ...[from.part, to.part].map((part) => ({
            left: part.x + 90 * partScale - 72,
            right: part.x + 90 * partScale + 72,
            top: part.y + partStateY(part) * partScale - 9,
            bottom: part.y + partStateY(part) * partScale + 4,
          })),
          ...[...endpoints.values()].map((endpoint) => ({
            left: endpoint.point.x - 11,
            right: endpoint.point.x + 11,
            top: endpoint.point.y - (isBladePart(endpoint.part) ? 22 : 11),
            bottom: endpoint.point.y + 11,
          })),
        ];
        route = [
          from.point,
          { x: from.point.x, y: start.y },
          ...corridorRoute(
            start,
            end,
            obstacles,
            corridors,
            lane,
            occupancy,
            wire,
            options.work,
            true,
            // Dense custom layouts trade corridor breadth for a fixed drag budget.
            options.clear && circuit.wires.length > 40 ? 8 : 24,
          ),
          { x: to.point.x, y: end.y },
          to.point,
        ];
      }
      // Remove zero-length points before rendering; endpoints remain exact.
      // Collinear reversals would draw a dangling spur although this is one
      // terminal-to-terminal conductor, not a three-way junction.
      const result = options.clear ? simplify(route) : compact(route);
      occupancy?.add(wire, result);
      return [wire.id, result] as const;
    }),
  );
}

export function wirePath(points: readonly Point[]) {
  return points
    .map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`)
    .join(' ');
}
