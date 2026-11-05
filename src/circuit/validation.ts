import {
  board,
  limits,
  partKinds,
  terminalId,
  terminalsFor,
  potRole,
  isPushPullPart,
  type Circuit,
  type Part,
  type PartKind,
} from './model';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype;
const hasKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const isNumber = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
const isId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[a-zA-Z0-9_-]{1,60}$/.test(value) &&
  !Object.hasOwn(Object.prototype, value);

function isMetadata(value: unknown): value is Circuit['metadata'] {
  if (
    !isRecord(value) ||
    !hasKeys(value, ['title', 'creator', 'sourceUrl', 'permission'])
  )
    return false;
  for (const [key, maximum] of Object.entries({
    title: 80,
    creator: 120,
    sourceUrl: 2048,
    permission: 500,
  }))
    if (typeof value[key] !== 'string' || value[key].length > maximum)
      return false;
  if (value.sourceUrl === '') return true;
  try {
    const url = new URL(value.sourceUrl as string);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isCircuit(value: unknown): value is Circuit {
  if (
    !isRecord(value) ||
    !hasKeys(value, ['version', 'metadata', 'parts', 'wires']) ||
    value.version !== 2 ||
    !isMetadata(value.metadata) ||
    !Array.isArray(value.parts) ||
    !Array.isArray(value.wires) ||
    value.parts.length > limits.parts ||
    value.wires.length > limits.wires
  )
    return false;
  const ids = new Set<string>();
  const terminalIds = new Set<string>();
  for (const part of value.parts) {
    if (
      !isRecord(part) ||
      !hasKeys(part, [
        'id',
        'kind',
        'label',
        'x',
        'y',
        'value',
        'position',
        ...(Object.hasOwn(part, 'resistanceKOhms') ? ['resistanceKOhms'] : []),
        ...['skin', 'hasSeparateShield', 'isPulled'].filter((key) =>
          Object.hasOwn(part, key),
        ),
      ]) ||
      !isId(part.id) ||
      ids.has(part.id) ||
      !partKinds.includes(part.kind as PartKind) ||
      typeof part.label !== 'string' ||
      part.label.length < 1 ||
      part.label.length > 40 ||
      !isNumber(part.x, 0, board.width - 180) ||
      !isNumber(part.y, 0, board.height - 155) ||
      !isNumber(part.value, 0, 100) ||
      typeof part.position !== 'string' ||
      !['neck', 'both', 'bridge'].includes(part.position)
    )
      return false;
    if (
      Object.hasOwn(part, 'resistanceKOhms') &&
      (!potRole(part as unknown as Part) ||
        ![250, 500, 1000].includes(part.resistanceKOhms as number))
    )
      return false;
    if (
      Object.hasOwn(part, 'skin') &&
      !(
        part.kind === 'pickup'
          ? ['p90', 'dynasonic']
          : part.kind === 'humbucker'
            ? ['filtertron', 'mini-humbucker']
            : []
      ).includes(part.skin as string)
    )
      return false;
    if (
      Object.hasOwn(part, 'hasSeparateShield') &&
      (part.kind !== 'pickup' || typeof part.hasSeparateShield !== 'boolean')
    )
      return false;
    if (
      Object.hasOwn(part, 'isPulled') &&
      (!isPushPullPart(part as unknown as Part) ||
        typeof part.isPulled !== 'boolean')
    )
      return false;
    if (
      (part.kind === 'blade4' || part.kind === 'varitone') &&
      (!Number.isInteger(part.value) ||
        part.value < 1 ||
        part.value > (part.kind === 'blade4' ? 4 : 6))
    )
      return false;
    if (
      part.kind === 'capacitor'
        ? ![22, 47, 12, 3.9].includes(part.value)
        : part.value > 10
    )
      return false;
    ids.add(part.id);
    for (const terminal of terminalsFor(part as unknown as Part))
      terminalIds.add(terminalId(part.id, terminal.name));
  }
  const wireIds = new Set<string>();
  const pairs = new Set<string>();
  for (const wire of value.wires) {
    if (
      !isRecord(wire) ||
      !hasKeys(wire, ['id', 'from', 'to']) ||
      !isId(wire.id) ||
      wireIds.has(wire.id) ||
      typeof wire.from !== 'string' ||
      typeof wire.to !== 'string' ||
      wire.from === wire.to ||
      !terminalIds.has(wire.from) ||
      !terminalIds.has(wire.to)
    )
      return false;
    const pair = [wire.from, wire.to].sort().join('|');
    if (pairs.has(pair)) return false;
    pairs.add(pair);
    wireIds.add(wire.id);
  }
  return true;
}
