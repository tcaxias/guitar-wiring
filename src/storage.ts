import { presetCircuit, type Circuit } from './circuit/model';
import { parseCircuitText } from './circuit/portable';
import { isCircuit } from './circuit/validation';

export const storageKey = 'pickup-lab:circuit:v2';
export const legacyStorageKey = 'pickup-lab:circuit:v1';
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;

export function loadCircuit(storage: StoragePort): {
  circuit: Circuit;
  message: string;
} {
  try {
    const current = storage.getItem(storageKey);
    const text = current === null ? storage.getItem(legacyStorageKey) : current;
    if (text === null)
      return {
        circuit: presetCircuit(),
        message: 'Ready to explore · saved on this browser',
      };
    const circuit = parseCircuitText(text);
    return {
      circuit,
      message:
        current === null
          ? 'Restored your saved circuit; original saved copy retained'
          : 'Restored your saved circuit from this browser',
    };
  } catch {
    return {
      circuit: presetCircuit(),
      message:
        'Saved work could not be read. Preset loaded; edit to save a fresh copy.',
    };
  }
}

export function saveCircuit(storage: StoragePort, circuit: Circuit): string {
  try {
    if (!isCircuit(circuit)) return 'Save skipped: invalid circuit.';
    storage.setItem(storageKey, JSON.stringify(circuit));
    return 'Saved on this browser';
  } catch {
    return 'Browser storage unavailable. Keep this tab open to retain your work.';
  }
}

export function browserStorage(): StoragePort {
  // Access to localStorage itself can throw in restricted browser contexts.
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  };
}
