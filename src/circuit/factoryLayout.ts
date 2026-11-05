import type { Part } from './model';

type Profile = 'tele' | 'four-way' | 'split' | 'varitone';

// Factory-only placement: never apply these profiles to restored or edited work.
export function factoryLayout(parts: Part[], profile: Profile): Part[] {
  const positions: Record<string, readonly [number, number]> = {
    neck: [240, 90],
    bridge: [240, 300],
    selector: [
      620,
      profile === 'split' ? 60 : profile === 'four-way' ? 130 : 160,
    ],
    volume: [620, profile === 'split' ? 220 : 320],
    tone: [620, profile === 'split' ? 450 : 460],
    capacitor: [820, 340],
    ground: [440, 480],
    jack: [820, 480],
    varitone: [820, 150],
  };
  return parts.map((part) => {
    const position = positions[part.id];
    return position ? { ...part, x: position[0], y: position[1] } : part;
  });
}
