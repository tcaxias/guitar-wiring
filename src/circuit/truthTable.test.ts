import { describe, expect, it } from 'vitest';
import { computeTruthTable } from './truthTable';
import { blankCircuit, createPart, presetCircuit } from './model';

describe('computeTruthTable', () => {
  it('returns empty rows and zero combinations for a circuit with no switches', () => {
    const circuit = {
      ...blankCircuit(),
      parts: [createPart('pickup', 'neck'), createPart('jack', 'jack', 1)],
      wires: [
        { id: 'w1', from: 'neck:hot', to: 'jack:tip' },
        { id: 'w2', from: 'neck:return', to: 'jack:sleeve' },
      ],
    };
    const table = computeTruthTable(circuit);
    expect(table.rows).toEqual([]);
    expect(table.totalCombinations).toBe(0);
    expect(table.truncated).toBe(false);
  });

  it('enumerates all positions for a 3-way blade switch', () => {
    const table = computeTruthTable(presetCircuit());
    expect(table.totalCombinations).toBe(3);
    expect(table.truncated).toBe(false);
    expect(table.rows).toHaveLength(3);
    const labels = table.rows.map((row) => row.positionLabel);
    expect(labels).toContain('Position 1');
    expect(labels).toContain('Position 2');
    expect(labels).toContain('Position 3');
  });

  it('produces a live status for at least one position in a valid circuit', () => {
    const table = computeTruthTable(presetCircuit());
    const liveRows = table.rows.filter((row) => row.estimate.status === 'live');
    expect(liveRows.length).toBeGreaterThan(0);
  });

  it('includes pickups, volume, tone, and output in each row', () => {
    const table = computeTruthTable(presetCircuit());
    const row = table.rows[0]!;
    expect(row.positionLabel).toBeDefined();
    expect(row.estimate.activePickups).toBeDefined();
    expect(row.estimate.output).toBeDefined();
    expect(row.estimate.treble).toBeDefined();
    expect(row.estimate.status).toBeDefined();
  });

  it('caps rows at 64 and marks truncated for many switches', () => {
    // Build a circuit with many push-pull parts to exceed 64 combinations.
    // The preset's 3-way blade (3 positions) × 6 push-pulls (2^6) = 192 > 64.
    const circuit = {
      ...presetCircuit(),
      parts: [
        ...presetCircuit().parts,
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `pp-${i}`,
          kind: 'push-pull-volume' as const,
          label: `Push-pull ${i}`,
          x: 100 + i * 50,
          y: 100,
          value: 10,
          position: 'both' as const,
          isPulled: false,
        })),
      ],
    };
    const table = computeTruthTable(circuit);
    expect(table.totalCombinations).toBe(192);
    expect(table.truncated).toBe(true);
    expect(table.rows).toHaveLength(64);
  });

  it('handles selector switch with neck/both/bridge positions', () => {
    const circuit = {
      ...presetCircuit(),
      parts: presetCircuit().parts.map((part) =>
        part.kind === 'blade' ? { ...part, position: 'neck' as const } : part,
      ),
    };
    const table = computeTruthTable(circuit);
    expect(table.totalCombinations).toBe(3);
    const labels = table.rows.map((row) => row.positionLabel);
    expect(labels).toContain('Position 1');
    expect(labels).toContain('Position 2');
    expect(labels).toContain('Position 3');
  });
});
