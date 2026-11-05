import { blankCircuit, limits, type Circuit } from './model';
import { isCircuit } from './validation';

export function migrateCircuit(value: unknown): Circuit | null {
  if (isCircuit(value)) return value;
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return null;
  const legacy = value as Record<string, unknown>;
  if (
    Object.getPrototypeOf(legacy) !== Object.prototype ||
    legacy.version !== 1 ||
    Object.keys(legacy).length !== 3 ||
    !Object.hasOwn(legacy, 'parts') ||
    !Object.hasOwn(legacy, 'wires')
  )
    return null;
  const migrated = {
    ...legacy,
    version: 2,
    metadata: { ...blankCircuit().metadata, title: 'Restored circuit' },
  };
  if (!isCircuit(migrated)) return null;
  if (
    migrated.parts.some(
      (part) =>
        !['pickup', 'selector', 'volume', 'tone', 'capacitor', 'jack'].includes(
          part.kind,
        ) ||
        ['resistanceKOhms', 'skin', 'hasSeparateShield', 'isPulled'].some(
          (key) => Object.hasOwn(part, key),
        ),
    )
  )
    return null;
  // Added pot lugs did not exist in v1; accepting them would disguise malformed
  // legacy data as a valid migration rather than preserving its original wiring.
  if (
    migrated.wires.some((wire) =>
      [wire.from, wire.to].some((endpoint) =>
        /:(casing|unused)$/.test(endpoint),
      ),
    )
  )
    return null;
  return migrated;
}

export function parseCircuitText(text: string): Circuit {
  if (text.length > limits.text)
    throw new Error('Circuit file is too large (maximum 120,000 characters).');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Circuit file must contain valid JSON.');
  }
  const circuit = migrateCircuit(value);
  if (!circuit)
    throw new Error(
      'Circuit file is invalid, unsupported, or exceeds workbench limits.',
    );
  return circuit;
}

export function serializeCircuit(circuit: Circuit): string {
  if (!isCircuit(circuit)) throw new Error('Cannot export an invalid circuit.');
  const text = JSON.stringify(circuit, null, 2);
  if (text.length > limits.text)
    throw new Error('Circuit file is too large to export.');
  return text;
}
