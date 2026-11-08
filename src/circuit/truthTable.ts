import { analyze, type Estimate } from './analyze';
import {
  isBladePart,
  isPushPullPart,
  varitoneSettings,
  type Circuit,
  type Part,
} from './model';

const MAX_ROWS = 64;

export interface SwitchPositionOption {
  value: string | number | boolean;
  label: string;
}

export interface SwitchablePart {
  part: Part;
  positions: SwitchPositionOption[];
}

export interface TruthTableRow {
  positionLabel: string;
  switchStates: Record<string, string | number | boolean>;
  estimate: Estimate;
}

export interface TruthTable {
  rows: TruthTableRow[];
  truncated: boolean;
  totalCombinations: number;
}

const positionLabel = (part: Part, option: SwitchPositionOption): string => {
  if (isBladePart(part)) return `Position ${option.value}`;
  if (part.kind === 'varitone') {
    const found = varitoneSettings.find(
      (setting) => setting.position === Number(option.value),
    );
    return found
      ? `Position ${found.position} · ${found.label}`
      : `Position ${option.value}`;
  }
  if (isPushPullPart(part)) return option.value ? 'Pulled' : 'Pushed';
  return String(option.value);
};

const switchableParts = (circuit: Circuit): SwitchablePart[] => {
  const result: SwitchablePart[] = [];
  for (const part of circuit.parts) {
    if (isPushPullPart(part)) {
      result.push({
        part,
        positions: [
          { value: false, label: 'Pushed' },
          { value: true, label: 'Pulled' },
        ],
      });
    } else if (isBladePart(part)) {
      const count = part.kind === 'blade4' ? 4 : 3;
      result.push({
        part,
        positions: Array.from({ length: count }, (_, i) => ({
          value: i + 1,
          label: `Position ${i + 1}`,
        })),
      });
    } else if (part.kind === 'varitone') {
      result.push({
        part,
        positions: Array.from({ length: 6 }, (_, i) => ({
          value: i + 1,
          label: `Position ${i + 1}`,
        })),
      });
    } else if (part.kind === 'selector') {
      result.push({
        part,
        positions: [
          { value: 'neck', label: 'Neck' },
          { value: 'both', label: 'Both' },
          { value: 'bridge', label: 'Bridge' },
        ],
      });
    }
  }
  return result;
};

const cartesianProduct = <T>(arrays: T[][]): T[][] => {
  if (arrays.length === 0) return [[]];
  const first = arrays[0]!;
  const rest = arrays.slice(1);
  const restProduct = cartesianProduct(rest);
  return first.flatMap((item) => restProduct.map((combo) => [item, ...combo]));
};

const setSwitchState = (
  circuit: Circuit,
  part: Part,
  option: SwitchPositionOption,
): Circuit => {
  const updates: Partial<Part> = {};
  if (isPushPullPart(part)) updates.isPulled = option.value === true;
  else if (isBladePart(part) || part.kind === 'varitone')
    updates.value = Number(option.value);
  else if (part.kind === 'selector')
    updates.position = option.value as 'neck' | 'both' | 'bridge';

  return {
    ...circuit,
    parts: circuit.parts.map((p) =>
      p.id === part.id ? { ...p, ...updates } : p,
    ),
  };
};

export const computeTruthTable = (circuit: Circuit): TruthTable => {
  const switches = switchableParts(circuit);
  if (switches.length === 0) {
    return { rows: [], truncated: false, totalCombinations: 0 };
  }

  const positionLists = switches.map((s) => s.positions);
  const combinations = cartesianProduct(positionLists);
  const totalCombinations = combinations.length;
  const truncated = totalCombinations > MAX_ROWS;
  const usable = truncated ? combinations.slice(0, MAX_ROWS) : combinations;

  const rows: TruthTableRow[] = [];
  for (const combo of usable) {
    let modified = circuit;
    const switchStates: Record<string, string | number | boolean> = {};
    const switchLabels: string[] = [];
    for (let i = 0; i < switches.length; i++) {
      const sw = switches[i]!;
      const option = combo[i]!;
      switchStates[sw.part.id] = option.value;
      switchLabels.push(positionLabel(sw.part, option));
      modified = setSwitchState(modified, sw.part, option);
    }
    const estimate = analyze(modified);
    rows.push({
      positionLabel: switchLabels.join(' + '),
      switchStates,
      estimate,
    });
  }

  return { rows, truncated, totalCombinations };
};

export const formatPickups = (estimate: Estimate, circuit: Circuit): string => {
  if (estimate.activePickups.length === 0) return 'None';
  return estimate.activePickups
    .map((id) => circuit.parts.find((part) => part.id === id)!.label)
    .join(' + ');
};

export const formatOutput = (estimate: Estimate): string => {
  if (estimate.output === null) return '—';
  return `${estimate.output}%`;
};

export const formatTreble = (estimate: Estimate): string => {
  if (estimate.treble === null) return '—';
  return `${estimate.treble}%`;
};
