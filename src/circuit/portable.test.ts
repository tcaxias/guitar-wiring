import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyze } from './analyze';
import {
  blankCircuit,
  circuitTitle,
  createPart,
  limits,
  presetCircuit,
} from './model';
import { migrateCircuit, parseCircuitText, serializeCircuit } from './portable';
import { humbuckerCircuit, legacyCircuit, legacyV1 } from './testFixtures';
import { isCircuit } from './validation';

describe('portable versioned circuits', () => {
  it('imports, estimates, and round-trips the documented minimal example', () => {
    const document = readFileSync(
      new URL('../../docs/diagram-format.md', import.meta.url),
      'utf8',
    );
    const example = document.match(
      /## Minimal example[\s\S]*?```json\r?\n([\s\S]*?)\r?\n```/,
    )?.[1];
    expect(example).toBeDefined();
    const circuit = parseCircuitText(example!);
    expect(analyze(circuit)).toMatchObject({
      status: 'live',
      output: 100,
      activePickups: ['pickup-1'],
    });
    expect(parseCircuitText(serializeCircuit(circuit))).toEqual(circuit);
  });

  it('round-trips an attributed preset and a blank build as readable JSON', () => {
    const circuit = {
      ...presetCircuit(),
      metadata: {
        title: 'Synthetic example',
        creator: 'Example author',
        sourceUrl: 'https://example.com/wiring',
        permission: 'Shared with permission for this test.',
      },
    };
    expect(serializeCircuit(circuit)).toContain('\n  "version": 2');
    expect(parseCircuitText(serializeCircuit(circuit))).toEqual(circuit);
    expect(parseCircuitText(serializeCircuit(blankCircuit()))).toEqual(
      blankCircuit(),
    );
  });

  it.each(['neck', 'both', 'bridge'] as const)(
    'preserves legacy wiring and settings at %s',
    (position) => {
      const legacy = legacyV1();
      legacy.parts = legacy.parts.map((part) => ({
        ...part,
        position,
        value: part.kind === 'capacitor' ? 47 : 4,
      }));
      const migrated = parseCircuitText(JSON.stringify(legacy));
      expect(migrated.version).toBe(2);
      expect(migrated.metadata.title).toBe('Restored circuit');
      expect(migrated.parts).toEqual(legacy.parts);
      expect(migrated.wires).toEqual(legacy.wires);
      expect(migrated.parts.find((part) => part.id === 'selector')?.kind).toBe(
        'selector',
      );
      expect(migrated.parts.find((part) => part.id === 'neck')?.kind).toBe(
        'pickup',
      );
      expect(analyze(migrated).activePickups).toEqual(
        position === 'both' ? ['neck', 'bridge'] : [position],
      );
      expect(analyze(migrated).output).toBe(40);
      expect(isCircuit(legacy)).toBe(false);
    },
  );

  it('does not accept new kinds or pot terminals in legacy files', () => {
    const legacy = legacyV1();
    expect(
      migrateCircuit({
        ...legacy,
        parts: legacy.parts.map((part) =>
          part.id === 'neck' ? { ...part, kind: 'humbucker' } : part,
        ),
      }),
    ).toBeNull();
    expect(
      migrateCircuit({
        ...legacy,
        wires: [
          ...legacy.wires,
          { id: 'case', from: 'volume:casing', to: 'jack:sleeve' },
        ],
      }),
    ).toBeNull();
    expect(
      migrateCircuit({ ...legacy, metadata: blankCircuit().metadata }),
    ).toBeNull();
  });

  it.each([
    'javascript:alert(1)',
    'data:text/plain,example',
    'file:///example',
    'not a URL',
  ])('rejects unsafe or invalid source URL %s', (sourceUrl) => {
    const circuit = blankCircuit();
    circuit.metadata.sourceUrl = sourceUrl;
    expect(() => parseCircuitText(JSON.stringify(circuit))).toThrow(/invalid/);
  });

  it.each([
    ['title', 80],
    ['creator', 120],
    ['sourceUrl', 2048],
    ['permission', 500],
  ] as const)('bounds metadata field %s', (field, maximum) => {
    const circuit = blankCircuit();
    circuit.metadata[field] = 'x'.repeat(maximum + 1);
    expect(isCircuit(circuit)).toBe(false);
    expect(
      isCircuit({
        ...blankCircuit(),
        metadata: { ...blankCircuit().metadata, [field]: {} },
      }),
    ).toBe(false);
  });

  it.each(['__proto__', 'constructor', 'toString', 'x'.repeat(61)])(
    'rejects unsafe or oversized record key %s',
    (id) => {
      const circuit = presetCircuit();
      expect(
        isCircuit({ ...circuit, parts: [{ ...circuit.parts[0], id }] }),
      ).toBe(false);
      expect(
        isCircuit({ ...circuit, wires: [{ ...circuit.wires[0], id }] }),
      ).toBe(false);
    },
  );

  it('rejects unknown versions, extra fields, missing metadata, and dangling or duplicate wires', () => {
    const circuit = presetCircuit();
    const { parts, wires } = circuit;
    for (const invalid of [
      { ...circuit, version: 3 },
      { version: 2, parts, wires },
      { ...circuit, extra: true },
      { ...circuit, metadata: { ...circuit.metadata, extra: {} } },
      { ...circuit, parts: [{ ...parts[0], extra: {} }] },
      { ...circuit, parts: [...parts, parts[0]] },
      { ...circuit, wires: [...wires, wires[0]] },
      {
        ...circuit,
        wires: [{ id: 'bad', from: 'neck:missing', to: 'jack:tip' }],
      },
      { ...circuit, wires: [{ ...wires[0], extra: true }] },
      {
        ...circuit,
        wires: [
          ...wires,
          { id: 'reverse', from: wires[0]!.to, to: wires[0]!.from },
        ],
      },
    ])
      expect(() => parseCircuitText(JSON.stringify(invalid))).toThrow(
        /invalid/,
      );
  });

  it('checks size before parsing and returns user-safe errors', () => {
    expect(() => parseCircuitText('x'.repeat(limits.text + 1))).toThrow(
      /too large/,
    );
    expect(() => parseCircuitText('{ private invalid text')).toThrow(
      'Circuit file must contain valid JSON.',
    );
    expect(() =>
      serializeCircuit({ ...blankCircuit(), version: 9 } as never),
    ).toThrow(/invalid/);
    expect(migrateCircuit(null)).toBeNull();
    expect(migrateCircuit([])).toBeNull();
    expect(migrateCircuit(new Date())).toBeNull();
  });

  it('round-trips explicit grounds, nominal ratings and exact current name', () => {
    const circuit = presetCircuit();
    expect(parseCircuitText(serializeCircuit(circuit))).toEqual(circuit);
    for (const resistanceKOhms of [250, 500, 1000]) {
      const rated = {
        ...circuit,
        parts: circuit.parts.map((part) =>
          part.kind === 'volume' ? { ...part, resistanceKOhms } : part,
        ),
      };
      expect(isCircuit(rated)).toBe(true);
    }
  });

  it('preserves older named v2 circuits without injecting grounds or pot metadata', () => {
    for (const circuit of [legacyCircuit(), humbuckerCircuit()]) {
      expect(migrateCircuit(circuit)).toBe(circuit);
      expect(parseCircuitText(serializeCircuit(circuit))).toEqual(circuit);
      expect(
        circuit.parts.every((part) => !Object.hasOwn(part, 'resistanceKOhms')),
      ).toBe(true);
      expect(circuit.parts.some((part) => part.kind === 'ground')).toBe(false);
    }
  });

  it('presents the old generated title without changing saved metadata or custom names', () => {
    const circuit = legacyCircuit();
    circuit.metadata.title = 'Imported legacy build';
    const parsed = parseCircuitText(serializeCircuit(circuit));
    expect(circuitTitle(parsed)).toBe('Restored circuit');
    expect(parsed).toEqual(circuit);
    expect(JSON.parse(serializeCircuit(parsed)).metadata.title).toBe(
      'Imported legacy build',
    );
    circuit.metadata.title = 'My own restored wiring';
    expect(circuitTitle(circuit)).toBe('My own restored wiring');
  });

  it('rejects new ground and rating metadata in strict v1', () => {
    const legacy = legacyV1();
    expect(
      migrateCircuit({
        ...legacy,
        parts: [...legacy.parts, createPart('ground', 'ground')],
      }),
    ).toBeNull();
    expect(
      migrateCircuit({
        ...legacy,
        parts: legacy.parts.map((part) =>
          part.kind === 'volume' ? { ...part, resistanceKOhms: 250 } : part,
        ),
      }),
    ).toBeNull();
    expect(migrateCircuit(legacy)?.parts).toEqual(legacy.parts);
  });

  it.each([null, '250', 0, 249, 750, {}, undefined])(
    'rejects invalid nominal pot rating %s',
    (resistanceKOhms) => {
      const circuit = presetCircuit();
      expect(
        isCircuit({
          ...circuit,
          parts: circuit.parts.map((part) =>
            part.kind === 'volume' ? { ...part, resistanceKOhms } : part,
          ),
        }),
      ).toBe(false);
    },
  );

  it('rejects pot ratings on other kinds, missing required fields, and invalid ground terminals', () => {
    for (const kind of [
      'pickup',
      'humbucker',
      'blade',
      'selector',
      'capacitor',
      'jack',
      'ground',
    ] as const)
      expect(
        isCircuit({
          ...blankCircuit(),
          parts: [{ ...createPart(kind, 'part'), resistanceKOhms: 250 }],
        }),
      ).toBe(false);
    const incomplete = Object.fromEntries(
      Object.entries(createPart('volume', 'volume')).filter(
        ([key]) => key !== 'position',
      ),
    );
    expect(
      isCircuit({
        ...blankCircuit(),
        parts: [{ ...incomplete, resistanceKOhms: 250 }],
      }),
    ).toBe(false);
    const circuit = presetCircuit();
    expect(
      isCircuit({
        ...circuit,
        wires: [
          ...circuit.wires,
          { id: 'bad', from: 'ground:earth', to: 'jack:sleeve' },
        ],
      }),
    ).toBe(false);
  });
});
