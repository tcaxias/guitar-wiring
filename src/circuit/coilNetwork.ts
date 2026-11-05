export interface CoilEdge {
  pickupId: string;
  coil?: 'a' | 'b';
  from: number;
  to: number;
  hot: string;
  return: string;
}

type Expression =
  | { kind: 'coil'; edge: CoilEdge; polarity: number }
  | { kind: 'series' | 'parallel'; children: Expression[] };
type ReducedEdge = { from: number; to: number; expression: Expression };
export type PickupTopology = 'single' | 'series' | 'parallel' | 'mixed' | null;

const reverse = (expression: Expression): Expression =>
  expression.kind === 'coil'
    ? { ...expression, polarity: -expression.polarity }
    : { ...expression, children: expression.children.map(reverse) };
const leaves = (
  expression: Expression,
): Extract<Expression, { kind: 'coil' }>[] =>
  expression.kind === 'coil'
    ? [expression]
    : expression.children.flatMap(leaves);
const orient = (edge: ReducedEdge, from: number) =>
  edge.from === from ? edge.expression : reverse(edge.expression);

function topology(expression: Expression): PickupTopology {
  if (new Set(leaves(expression).map(({ edge }) => edge.pickupId)).size === 1)
    return 'single';
  if (expression.kind === 'coil') return 'single';
  const nested = expression.children
    .map(topology)
    .filter((kind) => kind !== 'single');
  return nested.some((kind) => kind !== expression.kind)
    ? 'mixed'
    : expression.kind;
}

// Every reduction removes an edge or node; there is no enumeration of paths.
// Ideal shorts bypass coils, while dangling branches cannot contribute to output.
export function reduceCoilNetwork(
  coils: CoilEdge[],
  source: number,
  ground: number,
): {
  active: CoilEdge[];
  topology: PickupTopology;
  reason?: string;
} {
  const empty = { active: [], topology: null };
  if (source === ground) return empty;
  let edges: ReducedEdge[] = coils
    .filter((edge) => edge.from !== edge.to)
    .map((edge) => ({
      from: edge.from,
      to: edge.to,
      expression: { kind: 'coil', edge, polarity: 1 },
    }));
  const reachable = new Set([source]);
  const queue = [source];
  for (let index = 0; index < queue.length; index++)
    for (const edge of edges) {
      const next =
        edge.from === queue[index]
          ? edge.to
          : edge.to === queue[index]
            ? edge.from
            : undefined;
      if (next !== undefined && !reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  if (!reachable.has(ground)) return empty;
  edges = edges.filter((edge) => reachable.has(edge.from));
  // A cyclic lobe attached at just one junction is also a dead branch. Removing
  // each possible articulation in turn is bounded by the 48-coil model limit.
  for (const junction of reachable) {
    const connected = new Set(
      [source, ground].filter((node) => node !== junction),
    );
    const pending = [...connected];
    for (let index = 0; index < pending.length; index++)
      for (const edge of edges) {
        if (edge.from === junction || edge.to === junction) continue;
        const next =
          edge.from === pending[index]
            ? edge.to
            : edge.to === pending[index]
              ? edge.from
              : undefined;
        if (next !== undefined && !connected.has(next)) {
          connected.add(next);
          pending.push(next);
        }
      }
    edges = edges.filter(
      (edge) =>
        (edge.from === junction || connected.has(edge.from)) &&
        (edge.to === junction || connected.has(edge.to)),
    );
  }
  while (edges.length) {
    const self = edges.find((edge) => edge.from === edge.to);
    if (self) {
      edges = edges.filter((edge) => edge !== self);
      continue;
    }
    const nodes = [...new Set(edges.flatMap((edge) => [edge.from, edge.to]))];
    const dangling = nodes.find(
      (node) =>
        node !== source &&
        node !== ground &&
        edges.filter((edge) => edge.from === node || edge.to === node)
          .length === 1,
    );
    if (dangling !== undefined) {
      edges = edges.filter(
        (edge) => edge.from !== dangling && edge.to !== dangling,
      );
      continue;
    }
    const parallel = edges.find((edge, index) =>
      edges
        .slice(index + 1)
        .some(
          (other) =>
            (other.from === edge.from && other.to === edge.to) ||
            (other.from === edge.to && other.to === edge.from),
        ),
    );
    if (parallel) {
      const group = edges.filter(
        (edge) =>
          (edge.from === parallel.from && edge.to === parallel.to) ||
          (edge.from === parallel.to && edge.to === parallel.from),
      );
      edges = edges.filter((edge) => !group.includes(edge));
      edges.push({
        from: parallel.from,
        to: parallel.to,
        expression: {
          kind: 'parallel',
          children: group.map((edge) => orient(edge, parallel.from)),
        },
      });
      continue;
    }
    const junction = nodes.find(
      (node) =>
        node !== source &&
        node !== ground &&
        edges.filter((edge) => edge.from === node || edge.to === node)
          .length === 2,
    );
    if (junction !== undefined) {
      const pair = edges.filter(
        (edge) => edge.from === junction || edge.to === junction,
      );
      const [first, second] = pair as [ReducedEdge, ReducedEdge];
      const from = first.from === junction ? first.to : first.from;
      const to = second.from === junction ? second.to : second.from;
      edges = edges.filter((edge) => !pair.includes(edge));
      edges.push({
        from,
        to,
        expression: {
          kind: 'series',
          children: [orient(first, from), orient(second, junction)],
        },
      });
      continue;
    }
    break;
  }
  if (
    edges.length !== 1 ||
    ![edges[0]!.from, edges[0]!.to].includes(source) ||
    ![edges[0]!.from, edges[0]!.to].includes(ground)
  )
    return {
      ...empty,
      reason:
        'The coil network contains an irreducible bridge; only series/parallel networks are estimated.',
    };
  const expression = orient(edges[0]!, source);
  const active = leaves(expression);
  if (new Set(active.map((leaf) => leaf.polarity)).size > 1)
    return {
      ...empty,
      reason:
        'Coils have conflicting relative polarity; cancellation is not estimated.',
    };
  return {
    active: active.map((leaf) => leaf.edge),
    topology: topology(expression),
  };
}
