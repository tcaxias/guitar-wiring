import { factoryLayout } from './factoryLayout';

export const partKinds = [
  'pickup',
  'humbucker',
  'blade',
  'selector',
  'volume',
  'tone',
  'capacitor',
  'jack',
  'ground',
  'push-pull-volume',
  'push-pull-tone',
  'blade4',
  'varitone',
] as const;
export type PartKind = (typeof partKinds)[number];
export const paletteKinds = partKinds.filter((kind) => kind !== 'selector');
export type SwitchPosition = 'neck' | 'both' | 'bridge';

export interface Part {
  id: string;
  kind: PartKind;
  label: string;
  x: number;
  y: number;
  value: number;
  position: SwitchPosition;
  resistanceKOhms?: 250 | 500 | 1000;
  skin?: 'p90' | 'dynasonic' | 'filtertron' | 'mini-humbucker';
  hasSeparateShield?: boolean;
  isPulled?: boolean;
}

export interface Wire {
  id: string;
  from: string;
  to: string;
}

export interface Circuit {
  version: 2;
  metadata: {
    title: string;
    creator: string;
    sourceUrl: string;
    permission: string;
  };
  parts: Part[];
  wires: Wire[];
}

// Presentation only: old generated names must not rewrite someone's saved diagram.
export const circuitTitle = (circuit: Circuit) =>
  circuit.metadata.title === 'Imported legacy build'
    ? 'Restored circuit'
    : circuit.metadata.title || 'Untitled build';

export const limits = { parts: 24, wires: 80, text: 120_000 };
export const board = { width: 1080, height: 680 };
export const partScale = 0.62;

export const partLabels: Record<PartKind, string> = {
  pickup: 'Single coil',
  humbucker: 'Humbucker',
  blade: '3-way blade',
  selector: 'Selector',
  volume: 'Volume',
  tone: 'Tone',
  capacitor: 'Capacitor',
  jack: 'Output jack',
  ground: 'Ground',
  'push-pull-volume': 'Push-pull volume',
  'push-pull-tone': 'Push-pull tone',
  blade4: '4-way blade',
  varitone: 'Varitone',
};

export interface Terminal {
  name: string;
  label: string;
  x: number;
  y: number;
  exit?: 'left' | 'right' | 'down';
}
export const terminals: Record<PartKind, readonly Terminal[]> = {
  'push-pull-volume': [],
  'push-pull-tone': [],
  blade4: ['a', 'b'].flatMap((pole) =>
    ['common', '1', '2', '3', '4'].map((contact, index) => ({
      name: contact === 'common' ? `${pole}-common` : `${pole}${contact}`,
      label: `${pole.toUpperCase()}${contact === 'common' ? 'C' : contact}`,
      x: pole === 'a' ? 0 : 180,
      y: 20 + index * 40,
      exit: pole === 'a' ? ('left' as const) : ('right' as const),
    })),
  ),
  varitone: [
    { name: 'signal', label: 'SIGNAL', x: 24, y: 112 },
    { name: 'ground', label: 'GND', x: 156, y: 112 },
  ],
  ground: [{ name: 'common', label: 'GND', x: 24, y: 112 }],
  pickup: [
    { name: 'hot', label: 'HOT', x: 54, y: 112 },
    { name: 'return', label: 'RETURN', x: 126, y: 112 },
  ],
  humbucker: [
    { name: 'a-start', label: 'A START', x: 10, y: 125 },
    { name: 'a-finish', label: 'A END', x: 50, y: 150 },
    { name: 'b-start', label: 'B START', x: 90, y: 125 },
    { name: 'b-finish', label: 'B END', x: 130, y: 150 },
    { name: 'shield', label: 'SHIELD', x: 170, y: 125 },
  ],
  blade: [
    { name: 'a-common', label: 'AC', x: 0, y: 20, exit: 'left' },
    { name: 'a1', label: 'A1', x: 0, y: 60, exit: 'left' },
    { name: 'a2', label: 'A2', x: 0, y: 100, exit: 'left' },
    { name: 'a3', label: 'A3', x: 0, y: 140, exit: 'left' },
    { name: 'b-common', label: 'BC', x: 180, y: 20, exit: 'right' },
    { name: 'b1', label: 'B1', x: 180, y: 60, exit: 'right' },
    { name: 'b2', label: 'B2', x: 180, y: 100, exit: 'right' },
    { name: 'b3', label: 'B3', x: 180, y: 140, exit: 'right' },
  ],
  selector: [
    { name: 'neck', label: 'NECK', x: 20, y: 112 },
    { name: 'common', label: 'OUT', x: 90, y: 112 },
    { name: 'bridge', label: 'BRIDGE', x: 160, y: 112 },
  ],
  volume: [
    { name: 'input', label: '3', x: 156, y: 112 },
    { name: 'wiper', label: '2 WIPER', x: 90, y: 112 },
    { name: 'ground', label: '1', x: 24, y: 112 },
    { name: 'casing', label: 'CASE', x: 160, y: 40, exit: 'right' },
  ],
  tone: [
    { name: 'input', label: '1', x: 24, y: 112 },
    { name: 'wiper', label: '2 WIPER', x: 90, y: 112 },
    { name: 'unused', label: '3', x: 156, y: 112 },
    { name: 'casing', label: 'CASE', x: 160, y: 40, exit: 'right' },
  ],
  capacitor: [
    { name: 'a', label: 'A', x: 30, y: 112 },
    { name: 'b', label: 'B', x: 150, y: 112 },
  ],
  jack: [
    { name: 'tip', label: 'TIP', x: 54, y: 112 },
    { name: 'sleeve', label: 'SLEEVE', x: 126, y: 112 },
  ],
};

const pushPullTerminals: Terminal[] = ['a', 'b'].flatMap((pole) =>
  ['1', 'common', '2'].map((contact, index) => ({
    name: `switch-${pole}${contact === 'common' ? '-common' : contact}`,
    label: `${pole.toUpperCase()}${contact === 'common' ? 'C' : contact}`,
    x: pole === 'a' ? 0 : 180,
    y: 160 + index * 40,
    exit: pole === 'a' ? ('left' as const) : ('right' as const),
  })),
);
terminals['push-pull-volume'] = [...terminals.volume, ...pushPullTerminals];
terminals['push-pull-tone'] = [...terminals.tone, ...pushPullTerminals];

export const terminalsFor = (part: Part): readonly Terminal[] =>
  part.kind === 'pickup' && part.hasSeparateShield
    ? [...terminals.pickup, { name: 'shield', label: 'SHIELD', x: 170, y: 150 }]
    : terminals[part.kind];

export const potRole = (part: Part): 'volume' | 'tone' | null =>
  part.kind === 'volume' || part.kind === 'push-pull-volume'
    ? 'volume'
    : part.kind === 'tone' || part.kind === 'push-pull-tone'
      ? 'tone'
      : null;
export const isPushPullPart = (part: Part): boolean =>
  part.kind === 'push-pull-volume' || part.kind === 'push-pull-tone';
export const isBladePart = (part: Part): boolean =>
  part.kind === 'blade' || part.kind === 'blade4';
export const bladePosition = (part: Part): number =>
  part.kind === 'blade4'
    ? part.value
    : { neck: 1, both: 2, bridge: 3 }[part.position];

export const varitoneInductanceHenries = 1.5;
export const varitoneSettings: readonly {
  position: number;
  label: string;
  capacitanceNanofarads: number | null;
  frequencyHz: number | null;
}[] = [null, 1, 3, 10, 30, 220].map((capacitanceNanofarads, index) => ({
  position: index + 1,
  label:
    capacitanceNanofarads === null ? 'Bypass' : `${capacitanceNanofarads} nF`,
  capacitanceNanofarads,
  frequencyHz:
    capacitanceNanofarads === null
      ? null
      : Math.round(
          1 /
            (2 *
              Math.PI *
              Math.sqrt(
                varitoneInductanceHenries * capacitanceNanofarads * 1e-9,
              )),
        ),
}));
export const varitoneSetting = (part: Part) =>
  varitoneSettings[part.value - 1]!;

export const terminalId = (part: Part | string, name: string) =>
  `${typeof part === 'string' ? part : part.id}:${name}`;

export function switchConnections(part: Part): Array<[string, string]> {
  if (isPushPullPart(part))
    return ['a', 'b'].map((pole) => [
      terminalId(part, `switch-${pole}-common`),
      terminalId(part, `switch-${pole}${part.isPulled ? 2 : 1}`),
    ]);
  if (isBladePart(part)) {
    const position = bladePosition(part);
    return ['a', 'b'].map((pole) => [
      terminalId(part, `${pole}-common`),
      terminalId(part, `${pole}${position}`),
    ]);
  }
  if (part.kind === 'selector')
    return (['neck', 'bridge'] as const)
      .filter(
        (contact) => part.position === 'both' || part.position === contact,
      )
      .map((contact) => [
        terminalId(part, 'common'),
        terminalId(part, contact),
      ]);
  return [];
}

export function terminalPoints(circuit: Circuit) {
  return new Map(
    circuit.parts.flatMap((part) =>
      terminalsFor(part).map(
        (terminal) =>
          [
            terminalId(part, terminal.name),
            {
              x: part.x + terminal.x * partScale,
              y: part.y + terminal.y * partScale,
            },
          ] as const,
      ),
    ),
  );
}

export function createPart(kind: PartKind, id: string, index = 0): Part {
  return {
    id,
    kind,
    label: partLabels[kind],
    x: 40 + (index % 4) * 245,
    y: 55 + (Math.floor(index / 4) % 3) * 190,
    value:
      kind === 'capacitor'
        ? 22
        : kind === 'blade4' || kind === 'varitone'
          ? 1
          : 10,
    position: 'both',
  };
}

export const blankCircuit = (): Circuit => ({
  version: 2,
  metadata: {
    title: 'Untitled build',
    creator: '',
    sourceUrl: '',
    permission: '',
  },
  parts: [],
  wires: [],
});

export function presetCircuit(): Circuit {
  const parts: Part[] = [
    { ...createPart('pickup', 'neck'), label: 'Neck pickup', x: 65, y: 60 },
    {
      ...createPart('pickup', 'bridge'),
      label: 'Bridge pickup',
      x: 65,
      y: 340,
    },
    {
      ...createPart('blade', 'selector'),
      label: '3-way blade',
      x: 350,
      y: 60,
    },
    {
      ...createPart('volume', 'volume'),
      label: 'Master volume',
      resistanceKOhms: 250,
      x: 635,
      y: 60,
    },
    {
      ...createPart('tone', 'tone'),
      label: 'Master tone',
      resistanceKOhms: 250,
      x: 350,
      y: 340,
    },
    {
      ...createPart('capacitor', 'capacitor'),
      label: 'Tone capacitor',
      value: 47,
      x: 635,
      y: 340,
    },
    { ...createPart('jack', 'jack'), x: 875, y: 210 },
    { ...createPart('ground', 'ground'), x: 875, y: 420 },
  ];
  const connections = [
    ['neck:hot', 'selector:a1'],
    ['bridge:hot', 'selector:b3'],
    ['selector:a-common', 'volume:input'],
    ['volume:wiper', 'jack:tip'],
    ['volume:input', 'tone:input'],
    ['tone:wiper', 'capacitor:a'],
    ['capacitor:b', 'ground:common'],
    ['volume:ground', 'ground:common'],
    ['neck:return', 'ground:common'],
    ['bridge:return', 'ground:common'],
    ['selector:a1', 'selector:a2'],
    ['selector:b3', 'selector:b2'],
    ['selector:b-common', 'selector:a-common'],
    ['volume:casing', 'ground:common'],
    ['tone:casing', 'ground:common'],
    ['ground:common', 'jack:sleeve'],
  ];
  return {
    version: 2,
    metadata: {
      title: '2 single-coils, 3-way blade, 1 volume, 1 tone',
      creator: 'Pickup Lab',
      sourceUrl: '',
      permission: '',
    },
    parts: factoryLayout(parts, 'tele'),
    wires: connections.map(([from, to], index) => ({
      id: `wire-${index}`,
      from: from!,
      to: to!,
    })),
  };
}

export function removePart(circuit: Circuit, id: string): Circuit {
  return {
    ...circuit,
    parts: circuit.parts.filter((part) => part.id !== id),
    wires: circuit.wires.filter(
      (wire) =>
        !wire.from.startsWith(`${id}:`) && !wire.to.startsWith(`${id}:`),
    ),
  };
}

export function connect(
  circuit: Circuit,
  from: string,
  to: string,
  id: string,
): Circuit {
  const points = terminalPoints(circuit);
  if (
    from === to ||
    !points.has(from) ||
    !points.has(to) ||
    circuit.wires.length >= limits.wires ||
    circuit.wires.some(
      (wire) =>
        (wire.from === from && wire.to === to) ||
        (wire.from === to && wire.to === from),
    )
  )
    return circuit;
  return { ...circuit, wires: [...circuit.wires, { id, from, to }] };
}
