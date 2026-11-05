import type { Part } from '../circuit/model';

export function mergePartUpdates(part: Part, updates: Partial<Part>): Part {
  const next = { ...part, ...updates };
  // An absent appearance is valid; an own skin property with undefined is not.
  if (Object.hasOwn(updates, 'skin') && updates.skin === undefined)
    delete next.skin;
  return next;
}
