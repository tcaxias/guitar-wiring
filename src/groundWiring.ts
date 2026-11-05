export const groundWiringKey = 'pickup-lab:ground-wiring:v1';
type GroundWiringStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function loadGroundWiring(storage: GroundWiringStorage): boolean {
  try {
    return storage.getItem(groundWiringKey) === 'shown';
  } catch {
    return false;
  }
}

export function saveGroundWiring(
  storage: GroundWiringStorage,
  isShown: boolean,
): boolean {
  try {
    storage.setItem(groundWiringKey, isShown ? 'shown' : 'hidden');
    return true;
  } catch {
    return false;
  }
}
