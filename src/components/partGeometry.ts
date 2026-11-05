import {
  board,
  isBladePart,
  isPushPullPart,
  partScale,
  terminalsFor,
  type Part,
  type Terminal,
} from '../circuit/model';

// Text retains its previous board-space size while the material shapes shrink.
export const labelScale = 0.78 / partScale;
export const materialScale = 0.5 / partScale;
export const materialTransform = (x = 90, y = 58) =>
  `translate(${x} ${y}) scale(${materialScale}) translate(${-x} ${-y})`;
export const terminalHitRadius = 11 / partScale;
export function terminalLeadPath(part: Part, terminal: Terminal) {
  if (isBladePart(part))
    return `M${terminal.x + (terminal.exit === 'left' ? 14 : -14)} ${terminal.y}H${terminal.x}`;
  if (terminal.name.startsWith('switch-')) {
    const side = terminal.exit === 'left' ? -1 : 1;
    const edge = 90 + side * 60 * materialScale;
    const y = Math.max(204 - 50 * materialScale + 2, terminal.y);
    return `M${edge} ${y}H${edge + side * 8}V${terminal.y}H${terminal.x}`;
  }
  if (terminal.name === 'casing')
    return `M${90 + 47 * materialScale} ${terminal.y}H${terminal.x}`;
  if (part.kind === 'jack')
    return `M${terminal.name === 'tip' ? 78 : 102} 83V94H${terminal.x}V${terminal.y}`;
  if (
    part.kind === 'pickup' ||
    part.kind === 'humbucker' ||
    part.kind === 'selector'
  ) {
    const bottom =
      part.kind === 'pickup'
        ? part.skin
          ? 86
          : 84
        : part.kind === 'humbucker'
          ? 93
          : 96;
    const x = Math.max(44, Math.min(136, terminal.x));
    const y = 58 + (bottom - 58) * materialScale;
    return `M${x} ${y}V${y + 8}H${terminal.x}V${terminal.y}`;
  }
  return `M${terminal.x} ${terminal.y - 13}v13`;
}
export const partTitleY = (part: Part) => (isBladePart(part) ? -58 : -24);
export const partStateY = (part: Part) =>
  Math.max(170, ...terminalsFor(part).map((terminal) => terminal.y + 57));

export function clampPosition(part: Part, x = part.x, y = part.y) {
  const center = 90 * partScale;
  const titleHalfWidth = Math.max(72, (part.label.length * 16 * 0.78) / 2);
  // Leave room for outward escapes and counter-scaled titles at old saved edges.
  return {
    x: Math.max(
      Math.max(
        isBladePart(part) || isPushPullPart(part) ? 64 : 20,
        titleHalfWidth - center + 12,
      ),
      Math.min(
        board.width - Math.max(180, center + titleHalfWidth + 12),
        Math.round(x),
      ),
    ),
    y: Math.max(
      isBladePart(part) ? 60 : 52,
      Math.min(board.height - partStateY(part) * partScale - 90, Math.round(y)),
    ),
  };
}
