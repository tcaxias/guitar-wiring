import { describe, expect, it } from 'vitest';
import {
  legacyStorageKey,
  loadCircuit,
  saveCircuit,
  storageKey,
} from './storage';
import { blankCircuit, limits, presetCircuit } from './circuit/model';
import { isCircuit } from './circuit/validation';
import { humbuckerCircuit, legacyV1 } from './circuit/testFixtures';

const memoryStorage = (initial: string | null = null) => {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (key: string, next: string) => {
      expect(key).toBe(storageKey);
      value = next;
    },
  };
};

describe('local versioned persistence', () => {
  it('restores valid work and blank builds', () => {
    const storage = memoryStorage();
    expect(loadCircuit(storage).circuit).toEqual(presetCircuit());
    expect(saveCircuit(storage, blankCircuit())).toMatch(/Saved/);
    expect(loadCircuit(storage).circuit).toEqual(blankCircuit());
  });

  it('leaves previously saved named humbuckers and missing pot ratings unchanged', () => {
    const circuit = humbuckerCircuit();
    circuit.metadata.title = 'My previous named wiring';
    const text = JSON.stringify(circuit);
    const storage = memoryStorage(text);
    expect(loadCircuit(storage).circuit).toEqual(circuit);
    expect(storage.getItem()).toBe(text);
  });

  it.each([
    '{broken',
    '{"version":2}',
    'null',
    '[]',
    'x'.repeat(limits.text + 1),
  ])('recovers unreadable data without throwing', (text) => {
    const result = loadCircuit(memoryStorage(text));
    expect(result.circuit).toEqual(presetCircuit());
    expect(result.message).toMatch(/could not be read/);
  });

  it('handles storage access failures', () => {
    const storage = {
      getItem() {
        throw new Error('denied');
      },
      setItem() {
        throw new Error('quota');
      },
    };
    expect(loadCircuit(storage).circuit).toEqual(presetCircuit());
    expect(saveCircuit(storage, presetCircuit())).toMatch(/unavailable/);
  });

  it('validates finite values, positions, types, limits, and stable references', () => {
    const circuit = presetCircuit();
    expect(isCircuit(circuit)).toBe(true);
    for (const changes of [
      { value: NaN },
      { value: Infinity },
      { x: -1 },
      { y: 9999 },
      { label: 'x'.repeat(41) },
      { kind: 'unknown' },
      { id: 'bad:id' },
      { position: 'middle' },
      { value: 11 },
    ]) {
      expect(
        isCircuit({
          ...circuit,
          parts: circuit.parts.map((part, index) =>
            index ? part : { ...part, ...changes },
          ),
        }),
      ).toBe(false);
    }
    expect(
      isCircuit({ ...circuit, parts: Array(25).fill(circuit.parts[0]) }),
    ).toBe(false);
    expect(
      isCircuit({ ...circuit, parts: [...circuit.parts, circuit.parts[0]] }),
    ).toBe(false);
    expect(
      isCircuit({
        ...circuit,
        wires: [
          ...circuit.wires,
          { id: 'dangling', from: 'missing:hot', to: 'jack:tip' },
        ],
      }),
    ).toBe(false);
    expect(
      isCircuit({ ...circuit, wires: [...circuit.wires, circuit.wires[0]] }),
    ).toBe(false);
    expect(
      isCircuit({
        ...circuit,
        wires: [
          ...circuit.wires,
          { id: 'reverse', from: 'selector:neck', to: 'neck:hot' },
        ],
      }),
    ).toBe(false);
    expect(
      saveCircuit(memoryStorage(), { ...circuit, version: 3 } as never),
    ).toMatch(/invalid/);
  });

  it('migrates only when v2 is absent and never overwrites legacy work on load', () => {
    const legacy = JSON.stringify(legacyV1());
    const entries = new Map([[legacyStorageKey, legacy]]);
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => {
        entries.set(key, value);
      },
    };
    expect(loadCircuit(storage).circuit.version).toBe(2);
    expect(entries.size).toBe(1);
    expect(entries.get(legacyStorageKey)).toBe(legacy);
    entries.set(storageKey, '{invalid');
    expect(loadCircuit(storage).message).toMatch(/could not be read/);
    expect(entries.get(storageKey)).toBe('{invalid');
    expect(saveCircuit(storage, blankCircuit())).toMatch(/Saved/);
    expect(loadCircuit(storage).circuit).toEqual(blankCircuit());
    expect(entries.get(legacyStorageKey)).toBe(legacy);
  });
});
