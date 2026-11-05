import { createPart, presetCircuit, type Circuit } from './model';
import { factoryLayout } from './factoryLayout';

const permission = 'Reference credited; reuse terms not specified.';
const wires = (connections: string[][]) =>
  connections.map(([from, to], index) => ({
    id: `wire-${index}`,
    from: from!,
    to: to!,
  }));

export function splitHumbuckerCircuit(): Circuit {
  const circuit = presetCircuit();
  circuit.metadata = {
    title: '2 humbuckers, push-pull coil split',
    creator: 'Pickup Lab; reference: Fralin Pickups',
    sourceUrl: 'https://www.fralinpickups.com/2017/03/29/push-pull-pots-mods/',
    permission,
  };
  circuit.parts = circuit.parts.map((part) =>
    part.kind === 'pickup'
      ? {
          ...part,
          kind: 'humbucker',
          label: `${part.id === 'neck' ? 'Neck' : 'Bridge'} humbucker`,
        }
      : part.kind === 'volume'
        ? {
            ...part,
            kind: 'push-pull-volume',
            label: 'Split / master volume',
            resistanceKOhms: 500,
            isPulled: false,
          }
        : part.kind === 'tone'
          ? { ...part, resistanceKOhms: 500 }
          : part,
  );
  const endpoint = (terminal: string) =>
    terminal
      .replace(/^(neck|bridge):hot$/, '$1:a-start')
      .replace(/^(neck|bridge):return$/, '$1:b-finish');
  circuit.wires = wires([
    ...circuit.wires.map((wire) => [endpoint(wire.from), endpoint(wire.to)]),
    ['neck:a-finish', 'neck:b-start'],
    ['bridge:a-finish', 'bridge:b-start'],
    ['neck:shield', 'ground:common'],
    ['bridge:shield', 'ground:common'],
    ['neck:a-finish', 'volume:switch-a-common'],
    ['bridge:a-finish', 'volume:switch-b-common'],
    ['volume:switch-a2', 'ground:common'],
    ['volume:switch-b2', 'ground:common'],
  ]);
  circuit.parts = factoryLayout(circuit.parts, 'split');
  return circuit;
}

export function fourWayTeleCircuit(): Circuit {
  const circuit = presetCircuit();
  circuit.metadata = {
    title: '2 single-coils, 4-way series / parallel',
    creator: 'Pickup Lab; reference: StewMac',
    sourceUrl:
      'https://www.stewmac.com/video-and-ideas/online-resources/learn-about-guitar-pickups-and-electronics-and-wiring/oak-grigsby-4-way-2-pole-lever-switch-instructions/',
    permission,
  };
  circuit.parts = circuit.parts.map((part) =>
    part.id === 'neck'
      ? { ...part, hasSeparateShield: true }
      : part.id === 'selector'
        ? { ...part, kind: 'blade4', label: '4-way blade', value: 1 }
        : part,
  );
  circuit.wires = wires([
    ['neck:hot', 'volume:input'],
    ['bridge:return', 'ground:common'],
    ['selector:a-common', 'bridge:hot'],
    ['selector:b-common', 'neck:return'],
    ['selector:a2', 'volume:input'],
    ['selector:a3', 'volume:input'],
    ['selector:a4', 'selector:b4'],
    ['selector:b1', 'ground:common'],
    ['selector:b2', 'ground:common'],
    ['neck:shield', 'ground:common'],
    ...circuit.wires
      .filter(
        (wire) =>
          ![wire.from, wire.to].some((terminal) =>
            /^(neck|bridge|selector):/.test(terminal),
          ),
      )
      .map((wire) => [wire.from, wire.to]),
  ]);
  circuit.parts = factoryLayout(circuit.parts, 'four-way');
  return circuit;
}

export function varitoneCircuit(): Circuit {
  const circuit = presetCircuit();
  circuit.metadata = {
    title: 'Tele with six-position LC Varitone',
    creator: 'Pickup Lab; reference: Premier Guitar',
    sourceUrl:
      'https://www.premierguitar.com/pro-advice/mod-garage-varitone-wiring-reloaded-and-extended',
    permission,
  };
  circuit.parts.push(createPart('varitone', 'varitone'));
  circuit.wires.push(
    { id: 'varitone-signal', from: 'volume:input', to: 'varitone:signal' },
    { id: 'varitone-ground', from: 'varitone:ground', to: 'ground:common' },
  );
  circuit.parts = factoryLayout(circuit.parts, 'varitone');
  return circuit;
}

export function singlePickupOneVolumeOneTone(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: '1 single-coil, 1 volume, 1 tone',
      creator: 'Pickup Lab; reference: GuitarElectronics.com',
      sourceUrl:
        'https://guitarelectronics.com/guitar-wiring-resources/1-pickup-guitar-wiring-diagrams/1-humbucker-1-volume-1-tone/',
      permission,
    },
    parts: [
      { ...createPart('pickup', 'neck'), label: 'Neck pickup', x: 240, y: 90 },
      {
        ...createPart('volume', 'volume'),
        label: 'Master volume',
        resistanceKOhms: 250,
        x: 620,
        y: 320,
      },
      {
        ...createPart('tone', 'tone'),
        label: 'Master tone',
        resistanceKOhms: 250,
        x: 620,
        y: 460,
      },
      {
        ...createPart('capacitor', 'capacitor'),
        label: 'Tone capacitor',
        value: 47,
        x: 820,
        y: 340,
      },
      { ...createPart('jack', 'jack'), x: 820, y: 480 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      ['neck:hot', 'volume:input'],
      ['neck:return', 'ground:common'],
      ['volume:input', 'tone:input'],
      ['volume:wiper', 'jack:tip'],
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      ['tone:wiper', 'capacitor:a'],
      ['capacitor:b', 'ground:common'],
      ['ground:common', 'jack:sleeve'],
      ['tone:casing', 'ground:common'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'tele');
  return circuit;
}

export function singleHumbuckerOneVolumeOneTone(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: '1 humbucker, 1 volume, 1 tone',
      creator: 'Pickup Lab; reference: GuitarElectronics.com',
      sourceUrl:
        'https://guitarelectronics.com/guitar-wiring-resources/1-pickup-guitar-wiring-diagrams/1-humbucker-1-volume-1-tone/',
      permission,
    },
    parts: [
      {
        ...createPart('humbucker', 'neck'),
        label: 'Humbucker',
        x: 240,
        y: 90,
      },
      {
        ...createPart('volume', 'volume'),
        label: 'Master volume',
        resistanceKOhms: 500,
        x: 620,
        y: 320,
      },
      {
        ...createPart('tone', 'tone'),
        label: 'Master tone',
        resistanceKOhms: 500,
        x: 620,
        y: 460,
      },
      {
        ...createPart('capacitor', 'capacitor'),
        label: 'Tone capacitor',
        value: 47,
        x: 820,
        y: 340,
      },
      { ...createPart('jack', 'jack'), x: 820, y: 480 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      ['neck:a-start', 'volume:input'],
      ['neck:a-finish', 'neck:b-start'],
      ['neck:b-finish', 'ground:common'],
      ['neck:shield', 'ground:common'],
      ['volume:input', 'tone:input'],
      ['volume:wiper', 'jack:tip'],
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      ['tone:wiper', 'capacitor:a'],
      ['capacitor:b', 'ground:common'],
      ['ground:common', 'jack:sleeve'],
      ['tone:casing', 'ground:common'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'tele');
  return circuit;
}

export function twoHumbuckersThreeWayOneVolumeOneTone(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: '2 humbuckers, 3-way toggle, 1 volume, 1 tone',
      creator: 'Pickup Lab; reference: GuitarElectronics.com',
      sourceUrl:
        'https://guitarelectronics.com/guitar-wiring-resources/2-pickup-guitar-wiring-diagrams/2-humbuckers-w-3-way-switch/1-volume-1-tone/',
      permission,
    },
    parts: [
      {
        ...createPart('humbucker', 'neck'),
        label: 'Neck humbucker',
        x: 200,
        y: 90,
      },
      {
        ...createPart('humbucker', 'bridge'),
        label: 'Bridge humbucker',
        x: 200,
        y: 300,
      },
      {
        ...createPart('blade', 'selector'),
        label: '3-way blade',
        x: 420,
        y: 200,
      },
      {
        ...createPart('volume', 'volume'),
        label: 'Master volume',
        resistanceKOhms: 500,
        x: 620,
        y: 320,
      },
      {
        ...createPart('tone', 'tone'),
        label: 'Master tone',
        resistanceKOhms: 500,
        x: 620,
        y: 460,
      },
      {
        ...createPart('capacitor', 'capacitor'),
        label: 'Tone capacitor',
        value: 47,
        x: 820,
        y: 340,
      },
      { ...createPart('jack', 'jack'), x: 820, y: 480 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      // Neck pickup: hot → A1, return → ground
      ['neck:a-start', 'selector:a1'],
      ['neck:a-finish', 'ground:common'],
      ['neck:shield', 'ground:common'],
      // Bridge pickup: hot → B3, return → ground
      ['bridge:a-start', 'selector:b3'],
      ['bridge:a-finish', 'ground:common'],
      ['bridge:shield', 'ground:common'],
      // Switch: A-common → volume input, B-common → A-common (join poles)
      ['selector:a-common', 'volume:input'],
      ['selector:b-common', 'selector:a-common'],
      // Position jumpers: A1→A2 (neck), B3→B2 (bridge)
      ['selector:a1', 'selector:a2'],
      ['selector:b3', 'selector:b2'],
      // Volume → Tone → Capacitor → Ground
      ['volume:input', 'tone:input'],
      ['volume:wiper', 'jack:tip'],
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      ['tone:wiper', 'capacitor:a'],
      ['capacitor:b', 'ground:common'],
      ['tone:casing', 'ground:common'],
      // Ground → Jack sleeve
      ['ground:common', 'jack:sleeve'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'tele');
  return circuit;
}

export function singleHumbuckerOneVolume(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: '1 humbucker, 1 volume',
      creator: 'Pickup Lab; reference: Seymour Duncan',
      sourceUrl:
        'https://www.seymourduncan.com/images/wiring-diagrams/1H_1V.pdf',
      permission,
    },
    parts: [
      {
        ...createPart('humbucker', 'neck'),
        label: 'Humbucker',
        x: 240,
        y: 90,
      },
      {
        ...createPart('volume', 'volume'),
        label: 'Master volume',
        resistanceKOhms: 500,
        x: 620,
        y: 280,
      },
      { ...createPart('jack', 'jack'), x: 820, y: 280 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      ['neck:a-start', 'volume:input'],
      ['neck:a-finish', 'neck:b-start'],
      ['neck:b-finish', 'ground:common'],
      ['neck:shield', 'ground:common'],
      ['volume:wiper', 'jack:tip'],
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      ['ground:common', 'jack:sleeve'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'tele');
  return circuit;
}

export function twoHumbuckersThreeWayTwoVolumeTwoTone(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: '2 humbuckers, 3-way toggle, 2 volumes, 2 tones',
      creator: 'Pickup Lab; reference: GuitarElectronics.com',
      sourceUrl:
        'https://guitarelectronics.com/guitar-wiring-resources/2-pickup-guitar-wiring-diagrams/2-humbuckers-w-3-way-switch/2-volumes-2-tones/',
      permission,
    },
    parts: [
      {
        ...createPart('humbucker', 'neck'),
        label: 'Neck humbucker',
        x: 180,
        y: 90,
      },
      {
        ...createPart('humbucker', 'bridge'),
        label: 'Bridge humbucker',
        x: 180,
        y: 300,
      },
      {
        ...createPart('blade', 'selector'),
        label: '3-way blade',
        x: 420,
        y: 200,
      },
      {
        ...createPart('volume', 'volume'),
        label: 'Neck volume',
        resistanceKOhms: 500,
        x: 600,
        y: 180,
      },
      {
        ...createPart('tone', 'tone'),
        label: 'Neck tone',
        resistanceKOhms: 500,
        x: 600,
        y: 320,
      },
      {
        ...createPart('volume', 'volume-2'),
        label: 'Bridge volume',
        resistanceKOhms: 500,
        x: 780,
        y: 180,
      },
      {
        ...createPart('tone', 'tone-2'),
        label: 'Bridge tone',
        resistanceKOhms: 500,
        x: 780,
        y: 320,
      },
      {
        ...createPart('capacitor', 'capacitor'),
        label: 'Neck cap',
        value: 47,
        x: 900,
        y: 300,
      },
      {
        ...createPart('capacitor', 'capacitor-2'),
        label: 'Bridge cap',
        value: 47,
        x: 900,
        y: 400,
      },
      { ...createPart('jack', 'jack'), x: 875, y: 480 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      // Neck pickup: hot → neck volume input, return → ground
      ['neck:a-start', 'volume:input'],
      ['neck:a-finish', 'ground:common'],
      ['neck:shield', 'ground:common'],
      // Bridge pickup: hot → bridge volume input, return → ground
      ['bridge:a-start', 'volume-2:input'],
      ['bridge:a-finish', 'ground:common'],
      ['bridge:shield', 'ground:common'],
      // Switch: A-common → neck volume input, B-common → bridge volume input
      ['selector:a-common', 'volume:input'],
      ['selector:b-common', 'volume-2:input'],
      // Position jumpers
      ['selector:a1', 'selector:a2'],
      ['selector:b3', 'selector:b2'],
      // Each volume → jack tip (joined at jack)
      ['volume:wiper', 'jack:tip'],
      ['volume-2:wiper', 'jack:tip'],
      // Each volume → its tone
      ['volume:wiper', 'tone:input'],
      ['volume-2:wiper', 'tone-2:input'],
      // Each tone → its capacitor → ground
      ['tone:wiper', 'capacitor:a'],
      ['capacitor:b', 'ground:common'],
      ['tone-2:wiper', 'capacitor-2:a'],
      ['capacitor-2:b', 'ground:common'],
      // Grounds
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      ['volume-2:ground', 'ground:common'],
      ['volume-2:casing', 'ground:common'],
      ['tone:casing', 'ground:common'],
      ['tone-2:casing', 'ground:common'],
      ['ground:common', 'jack:sleeve'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'split');
  return circuit;
}

export function twoHumbuckersThreeWayTwoVolumeTwoTone50sWiring(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: '2 humbuckers, 3-way toggle, 2V/2T, 50s wiring',
      creator: 'Pickup Lab; reference: Fralin Pickups',
      sourceUrl:
        'https://www.fralinpickups.com/diagram/gibson-les-paul-wiring-50s-wiring/',
      permission,
    },
    parts: [
      {
        ...createPart('humbucker', 'neck'),
        label: 'Neck humbucker',
        x: 180,
        y: 90,
      },
      {
        ...createPart('humbucker', 'bridge'),
        label: 'Bridge humbucker',
        x: 180,
        y: 300,
      },
      {
        ...createPart('blade', 'selector'),
        label: '3-way blade',
        x: 420,
        y: 200,
      },
      {
        ...createPart('volume', 'volume'),
        label: 'Neck volume',
        resistanceKOhms: 500,
        x: 600,
        y: 180,
      },
      {
        ...createPart('tone', 'tone'),
        label: 'Neck tone',
        resistanceKOhms: 500,
        x: 600,
        y: 320,
      },
      {
        ...createPart('volume', 'volume-2'),
        label: 'Bridge volume',
        resistanceKOhms: 500,
        x: 780,
        y: 180,
      },
      {
        ...createPart('tone', 'tone-2'),
        label: 'Bridge tone',
        resistanceKOhms: 500,
        x: 780,
        y: 320,
      },
      {
        ...createPart('capacitor', 'capacitor'),
        label: 'Neck cap',
        value: 47,
        x: 900,
        y: 300,
      },
      {
        ...createPart('capacitor', 'capacitor-2'),
        label: 'Bridge cap',
        value: 47,
        x: 900,
        y: 400,
      },
      { ...createPart('jack', 'jack'), x: 875, y: 480 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      // Neck pickup: hot → neck volume input, return → ground
      ['neck:a-start', 'volume:input'],
      ['neck:a-finish', 'ground:common'],
      ['neck:shield', 'ground:common'],
      // Bridge pickup: hot → bridge volume input, return → ground
      ['bridge:a-start', 'volume-2:input'],
      ['bridge:a-finish', 'ground:common'],
      ['bridge:shield', 'ground:common'],
      // Switch: A-common → neck volume input, B-common → bridge volume input
      ['selector:a-common', 'volume:input'],
      ['selector:b-common', 'volume-2:input'],
      // Position jumpers
      ['selector:a1', 'selector:a2'],
      ['selector:b3', 'selector:b2'],
      // Each volume → jack tip (joined at jack)
      ['volume:wiper', 'jack:tip'],
      ['volume-2:wiper', 'jack:tip'],
      // 50s wiring: tone taps off volume INPUT (before attenuation),
      // not the wiper. Each volume input feeds its tone input.
      ['volume:input', 'tone:input'],
      ['volume-2:input', 'tone-2:input'],
      // Each tone → its capacitor → ground
      ['tone:wiper', 'capacitor:a'],
      ['capacitor:b', 'ground:common'],
      ['tone-2:wiper', 'capacitor-2:a'],
      ['capacitor-2:b', 'ground:common'],
      // Grounds
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      ['volume-2:ground', 'ground:common'],
      ['volume-2:casing', 'ground:common'],
      ['tone:casing', 'ground:common'],
      ['tone-2:casing', 'ground:common'],
      ['ground:common', 'jack:sleeve'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'split');
  return circuit;
}

export function twoHumbuckersThreeWayOneVolumeOneTonePushPullTone(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: '2 humbuckers, 3-way toggle, 1V/1T, push-pull tone split',
      creator: 'Pickup Lab; reference: PRS Guitars',
      sourceUrl: 'https://www.cpearson.me.uk/2023/10/06/prs_se_24_wiring/',
      permission,
    },
    parts: [
      {
        ...createPart('humbucker', 'neck'),
        label: 'Neck humbucker',
        x: 180,
        y: 90,
      },
      {
        ...createPart('humbucker', 'bridge'),
        label: 'Bridge humbucker',
        x: 180,
        y: 300,
      },
      {
        ...createPart('blade', 'selector'),
        label: '3-way blade',
        x: 420,
        y: 200,
      },
      {
        ...createPart('volume', 'volume'),
        label: 'Master volume',
        resistanceKOhms: 500,
        x: 620,
        y: 320,
      },
      {
        ...createPart('push-pull-tone', 'tone'),
        label: 'Master tone / coil split',
        resistanceKOhms: 500,
        isPulled: false,
        x: 620,
        y: 460,
      },
      {
        ...createPart('capacitor', 'capacitor'),
        label: 'Tone capacitor',
        value: 47,
        x: 820,
        y: 340,
      },
      { ...createPart('jack', 'jack'), x: 820, y: 480 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      // Neck pickup: hot → A1/A2 (via jumper), return → ground
      ['neck:a-start', 'selector:a1'],
      ['neck:a-finish', 'neck:b-start'],
      ['neck:b-finish', 'ground:common'],
      ['neck:shield', 'ground:common'],
      // Bridge pickup: hot → B3/B2 (via jumper), return → ground
      ['bridge:a-start', 'selector:b3'],
      ['bridge:a-finish', 'bridge:b-start'],
      ['bridge:b-finish', 'ground:common'],
      ['bridge:shield', 'ground:common'],
      // Switch: commons joined, feed volume input
      ['selector:a-common', 'volume:input'],
      ['selector:b-common', 'selector:a-common'],
      // Position jumpers
      ['selector:a1', 'selector:a2'],
      ['selector:b3', 'selector:b2'],
      // Volume input feeds the tone branch; the wiper drives the jack tip.
      ['volume:input', 'tone:input'],
      ['volume:wiper', 'jack:tip'],
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      // Tone → Capacitor → Ground
      ['tone:wiper', 'capacitor:a'],
      ['capacitor:b', 'ground:common'],
      ['tone:casing', 'ground:common'],
      // Push-pull switch (on tone pot): coil split for both humbuckers
      // Pushed: switch-a-common → switch-a1 (series link intact, nothing on a1)
      // Pulled: switch-a-common → switch-a2 → ground (coil B shorted)
      ['neck:a-finish', 'tone:switch-a-common'],
      ['tone:switch-a2', 'ground:common'],
      ['bridge:a-finish', 'tone:switch-b-common'],
      ['tone:switch-b2', 'ground:common'],
      // Ground → Jack sleeve
      ['ground:common', 'jack:sleeve'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'split');
  return circuit;
}

export function gretschSetzerHotRodCircuit(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: 'Gretsch Setzer Hot Rod',
      creator: 'Pickup Lab; reference: Gretsch Guitars',
      sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
      permission: 'Reference credited; reuse terms not specified. Circuit reconstructed from Gretsch PDF title and known Gretsch wiring conventions; verify against source PDF (Setzer-Hot-Rod_Circuit.pdf).',
    },
    parts: [
      { ...createPart('humbucker', 'neck'), label: 'Neck Filter\'Tron', x: 240, y: 90, skin: 'filtertron' },
      { ...createPart('humbucker', 'bridge'), label: 'Bridge Filter\'Tron', x: 240, y: 300, skin: 'filtertron' },
      { ...createPart('blade', 'selector'), label: '3-way toggle', x: 420, y: 200 },
      { ...createPart('volume', 'volume'), label: 'Master volume', x: 620, y: 200, resistanceKOhms: 500 },
      { ...createPart('jack', 'jack'), x: 820, y: 200 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      ['neck:a-start', 'selector:a1'],
      ['neck:a-finish', 'neck:b-start'],
      ['neck:b-finish', 'ground:common'],
      ['neck:shield', 'ground:common'],
      ['bridge:a-start', 'selector:b3'],
      ['bridge:a-finish', 'bridge:b-start'],
      ['bridge:b-finish', 'ground:common'],
      ['bridge:shield', 'ground:common'],
      ['selector:a-common', 'volume:input'],
      ['selector:b-common', 'selector:a-common'],
      ['selector:a1', 'selector:a2'],
      ['selector:b3', 'selector:b2'],
      ['volume:wiper', 'jack:tip'],
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      ['ground:common', 'jack:sleeve'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'tele');
  return circuit;
}

export function gretschG6122CountryGentlemanCircuit(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: 'Gretsch G6122-1959 Country Gentleman',
      creator: 'Pickup Lab; reference: Gretsch Guitars',
      sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
      permission: 'Reference credited; reuse terms not specified. Circuit reconstructed from Gretsch PDF title and known Gretsch wiring conventions; verify against source PDF (NoToneREV.pdf).',
    },
    parts: [
      { ...createPart('humbucker', 'neck'), label: 'Neck Filter\'Tron', x: 240, y: 90, skin: 'filtertron' },
      { ...createPart('humbucker', 'bridge'), label: 'Bridge Filter\'Tron', x: 240, y: 300, skin: 'filtertron' },
      { ...createPart('blade', 'selector'), label: '3-way toggle', x: 420, y: 200 },
      { ...createPart('volume', 'volume'), label: 'Neck volume', x: 600, y: 180, resistanceKOhms: 500 },
      { ...createPart('volume', 'volume-2'), label: 'Bridge volume', x: 780, y: 180, resistanceKOhms: 500 },
      { ...createPart('volume', 'master'), label: 'Master volume', x: 690, y: 320, resistanceKOhms: 500 },
      { ...createPart('jack', 'jack'), x: 820, y: 480 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      ['neck:a-start', 'volume:input'],
      ['neck:a-finish', 'neck:b-start'],
      ['neck:b-finish', 'ground:common'],
      ['neck:shield', 'ground:common'],
      ['bridge:a-start', 'volume-2:input'],
      ['bridge:a-finish', 'bridge:b-start'],
      ['bridge:b-finish', 'ground:common'],
      ['bridge:shield', 'ground:common'],
      ['selector:a-common', 'volume:wiper'],
      ['selector:b-common', 'volume-2:wiper'],
      ['selector:a1', 'selector:a2'],
      ['selector:b3', 'selector:b2'],
      ['selector:b-common', 'selector:a-common'],
      ['volume:wiper', 'master:input'],
      ['volume-2:wiper', 'master:input'],
      ['master:wiper', 'jack:tip'],
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      ['volume-2:ground', 'ground:common'],
      ['volume-2:casing', 'ground:common'],
      ['master:ground', 'ground:common'],
      ['master:casing', 'ground:common'],
      ['ground:common', 'jack:sleeve'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'split');
  return circuit;
}

export function gretschTonePotCircuit(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: 'Gretsch Tone Pot Circuit',
      creator: 'Pickup Lab; reference: Gretsch Guitars',
      sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
      permission: 'Reference credited; reuse terms not specified. Circuit reconstructed from Gretsch PDF title and known Gretsch wiring conventions; verify against source PDF (TonePotRev.pdf). Gretsch typically uses 500k audio pots and a .022 uF tone cap (modeled as capacitor value 22 = 22 nF).',
    },
    parts: [
      { ...createPart('humbucker', 'neck'), label: 'Neck Filter\'Tron', x: 240, y: 90, skin: 'filtertron' },
      { ...createPart('humbucker', 'bridge'), label: 'Bridge Filter\'Tron', x: 240, y: 300, skin: 'filtertron' },
      { ...createPart('blade', 'selector'), label: '3-way toggle', x: 420, y: 200 },
      { ...createPart('volume', 'volume'), label: 'Neck volume', x: 600, y: 180, resistanceKOhms: 500 },
      { ...createPart('volume', 'volume-2'), label: 'Bridge volume', x: 780, y: 180, resistanceKOhms: 500 },
      { ...createPart('volume', 'master'), label: 'Master volume', x: 690, y: 320, resistanceKOhms: 500 },
      { ...createPart('tone', 'tone'), label: 'Master tone', x: 690, y: 460, resistanceKOhms: 500 },
      { ...createPart('capacitor', 'capacitor'), label: 'Tone capacitor', x: 820, y: 340, value: 22 },
      { ...createPart('jack', 'jack'), x: 820, y: 480 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      ['neck:a-start', 'volume:input'],
      ['neck:a-finish', 'neck:b-start'],
      ['neck:b-finish', 'ground:common'],
      ['neck:shield', 'ground:common'],
      ['bridge:a-start', 'volume-2:input'],
      ['bridge:a-finish', 'bridge:b-start'],
      ['bridge:b-finish', 'ground:common'],
      ['bridge:shield', 'ground:common'],
      ['selector:a-common', 'volume:wiper'],
      ['selector:b-common', 'volume-2:wiper'],
      ['selector:a1', 'selector:a2'],
      ['selector:b3', 'selector:b2'],
      ['selector:b-common', 'selector:a-common'],
      ['volume:wiper', 'master:input'],
      ['volume-2:wiper', 'master:input'],
      ['master:wiper', 'jack:tip'],
      ['master:input', 'tone:input'],
      ['tone:wiper', 'capacitor:a'],
      ['capacitor:b', 'ground:common'],
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      ['volume-2:ground', 'ground:common'],
      ['volume-2:casing', 'ground:common'],
      ['master:ground', 'ground:common'],
      ['master:casing', 'ground:common'],
      ['tone:casing', 'ground:common'],
      ['ground:common', 'jack:sleeve'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'split');
  return circuit;
}

export function gretschToneSwitchCircuit(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: 'Gretsch Tone Switch Circuit',
      creator: 'Pickup Lab; reference: Gretsch Guitars',
      sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
      permission: 'Reference credited; reuse terms not specified. Circuit reconstructed from Gretsch PDF title and known Gretsch wiring conventions; verify against source PDF (ToneSwitchRev.pdf). LIMITATION: This diagram uses a two-way tone switch selecting between two caps (.012 uF and .0039 uF). The current model supports a single capacitor (value 22, 47, 12, or 3.9 nF); modeled here with one capacitor at value 22 as an approximation. Gretsch typically uses 500k audio pots.',
    },
    parts: [
      { ...createPart('humbucker', 'neck'), label: 'Neck Filter\'Tron', x: 240, y: 90, skin: 'filtertron' },
      { ...createPart('humbucker', 'bridge'), label: 'Bridge Filter\'Tron', x: 240, y: 300, skin: 'filtertron' },
      { ...createPart('blade', 'selector'), label: '3-way toggle', x: 420, y: 200 },
      { ...createPart('volume', 'volume'), label: 'Neck volume', x: 600, y: 180, resistanceKOhms: 500 },
      { ...createPart('volume', 'volume-2'), label: 'Bridge volume', x: 780, y: 180, resistanceKOhms: 500 },
      { ...createPart('volume', 'master'), label: 'Master volume', x: 690, y: 320, resistanceKOhms: 500 },
      { ...createPart('tone', 'tone'), label: 'Tone switch', x: 690, y: 460, resistanceKOhms: 500 },
      { ...createPart('capacitor', 'capacitor'), label: 'Tone capacitor', x: 820, y: 340, value: 22 },
      { ...createPart('jack', 'jack'), x: 820, y: 480 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      ['neck:a-start', 'volume:input'],
      ['neck:a-finish', 'neck:b-start'],
      ['neck:b-finish', 'ground:common'],
      ['neck:shield', 'ground:common'],
      ['bridge:a-start', 'volume-2:input'],
      ['bridge:a-finish', 'bridge:b-start'],
      ['bridge:b-finish', 'ground:common'],
      ['bridge:shield', 'ground:common'],
      ['selector:a-common', 'volume:wiper'],
      ['selector:b-common', 'volume-2:wiper'],
      ['selector:a1', 'selector:a2'],
      ['selector:b3', 'selector:b2'],
      ['selector:b-common', 'selector:a-common'],
      ['volume:wiper', 'master:input'],
      ['volume-2:wiper', 'master:input'],
      ['master:wiper', 'jack:tip'],
      ['master:input', 'tone:input'],
      ['tone:wiper', 'capacitor:a'],
      ['capacitor:b', 'ground:common'],
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      ['volume-2:ground', 'ground:common'],
      ['volume-2:casing', 'ground:common'],
      ['master:ground', 'ground:common'],
      ['master:casing', 'ground:common'],
      ['tone:casing', 'ground:common'],
      ['ground:common', 'jack:sleeve'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'split');
  return circuit;
}

export function gretschToneStandbySwitchCircuit(): Circuit {
  const circuit: Circuit = {
    version: 2,
    metadata: {
      title: 'Gretsch Tone/Standby Switch Circuit',
      creator: 'Pickup Lab; reference: Gretsch Guitars',
      sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
      permission: 'Reference credited; reuse terms not specified. Circuit reconstructed from Gretsch PDF title and known Gretsch wiring conventions; verify against source PDF (ToneSwitchStandBySwitchREV.pdf). LIMITATIONS: This diagram uses (1) a two-way tone switch selecting between two caps (.012 uF and .0039 uF) and (2) a standby switch that shorts output to ground. Neither switch type is representable in the current model; modeled here with one capacitor at value 22 as an approximation, with no standby switching. Gretsch typically uses 500k audio pots.',
    },
    parts: [
      { ...createPart('humbucker', 'neck'), label: 'Neck Filter\'Tron', x: 240, y: 90, skin: 'filtertron' },
      { ...createPart('humbucker', 'bridge'), label: 'Bridge Filter\'Tron', x: 240, y: 300, skin: 'filtertron' },
      { ...createPart('blade', 'selector'), label: '3-way toggle', x: 420, y: 200 },
      { ...createPart('volume', 'volume'), label: 'Neck volume', x: 600, y: 180, resistanceKOhms: 500 },
      { ...createPart('volume', 'volume-2'), label: 'Bridge volume', x: 780, y: 180, resistanceKOhms: 500 },
      { ...createPart('volume', 'master'), label: 'Master volume', x: 690, y: 320, resistanceKOhms: 500 },
      { ...createPart('tone', 'tone'), label: 'Tone / standby switch', x: 690, y: 460, resistanceKOhms: 500 },
      { ...createPart('capacitor', 'capacitor'), label: 'Tone capacitor', x: 820, y: 340, value: 22 },
      { ...createPart('jack', 'jack'), x: 820, y: 480 },
      { ...createPart('ground', 'ground'), x: 440, y: 480 },
    ],
    wires: wires([
      ['neck:a-start', 'volume:input'],
      ['neck:a-finish', 'neck:b-start'],
      ['neck:b-finish', 'ground:common'],
      ['neck:shield', 'ground:common'],
      ['bridge:a-start', 'volume-2:input'],
      ['bridge:a-finish', 'bridge:b-start'],
      ['bridge:b-finish', 'ground:common'],
      ['bridge:shield', 'ground:common'],
      ['selector:a-common', 'volume:wiper'],
      ['selector:b-common', 'volume-2:wiper'],
      ['selector:a1', 'selector:a2'],
      ['selector:b3', 'selector:b2'],
      ['selector:b-common', 'selector:a-common'],
      ['volume:wiper', 'master:input'],
      ['volume-2:wiper', 'master:input'],
      ['master:wiper', 'jack:tip'],
      ['master:input', 'tone:input'],
      ['tone:wiper', 'capacitor:a'],
      ['capacitor:b', 'ground:common'],
      ['volume:ground', 'ground:common'],
      ['volume:casing', 'ground:common'],
      ['volume-2:ground', 'ground:common'],
      ['volume-2:casing', 'ground:common'],
      ['master:ground', 'ground:common'],
      ['master:casing', 'ground:common'],
      ['tone:casing', 'ground:common'],
      ['ground:common', 'jack:sleeve'],
    ]),
  };
  circuit.parts = factoryLayout(circuit.parts, 'split');
  return circuit;
}

export const exampleLibrary: {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  createCircuit: () => Circuit;
}[] = [
  {
    id: 'standard-tele',
    title: 'Standard Tele',
    description: 'Original 3-way, two-single-coil preset.',
    sourceUrl: '',
    createCircuit: presetCircuit,
  },
  {
    id: 'split-humbuckers',
    title: 'Push-pull coil split',
    description: 'Two four-lead humbuckers; pull to retain each A coil.',
    sourceUrl: 'https://www.fralinpickups.com/2017/03/29/push-pull-pots-mods/',
    createCircuit: splitHumbuckerCircuit,
  },
  {
    id: 'tele-four-way',
    title: '4-way Tele',
    description: 'Neck, parallel, bridge, series; separate neck cover ground.',
    sourceUrl:
      'https://www.stewmac.com/video-and-ideas/online-resources/learn-about-guitar-pickups-and-electronics-and-wiring/oak-grigsby-4-way-2-pole-lever-switch-instructions/',
    createCircuit: fourWayTeleCircuit,
  },
  {
    id: 'varitone-tele',
    title: 'LC Varitone Tele',
    description:
      'Qualitative six-position LC shunt; not an exact vintage response.',
    sourceUrl:
      'https://www.premierguitar.com/pro-advice/mod-garage-varitone-wiring-reloaded-and-extended',
    createCircuit: varitoneCircuit,
  },
  {
    id: 'single-pickup-1v-1t',
    title: '1 single-coil, 1 volume, 1 tone',
    description: 'Single pickup with master volume and master tone.',
    sourceUrl:
      'https://guitarelectronics.com/guitar-wiring-resources/1-pickup-guitar-wiring-diagrams/1-humbucker-1-volume-1-tone/',
    createCircuit: singlePickupOneVolumeOneTone,
  },
  {
    id: 'single-humbucker-1v-1t',
    title: '1 humbucker, 1 volume, 1 tone',
    description: 'Single humbucker with master volume and master tone.',
    sourceUrl:
      'https://guitarelectronics.com/guitar-wiring-resources/1-pickup-guitar-wiring-diagrams/1-humbucker-1-volume-1-tone/',
    createCircuit: singleHumbuckerOneVolumeOneTone,
  },
  {
    id: 'single-humbucker-1v',
    title: '1 humbucker, 1 volume',
    description: 'Single humbucker with master volume only (no tone).',
    sourceUrl: 'https://www.seymourduncan.com/images/wiring-diagrams/1H_1V.pdf',
    createCircuit: singleHumbuckerOneVolume,
  },
  {
    id: 'two-humbuckers-3way-1v-1t',
    title: '2 humbuckers, 3-way toggle, 1 volume, 1 tone',
    description:
      'Les Paul style: two humbuckers, 3-way toggle, shared controls.',
    sourceUrl:
      'https://guitarelectronics.com/guitar-wiring-resources/2-pickup-guitar-wiring-diagrams/2-humbuckers-w-3-way-switch/1-volume-1-tone/',
    createCircuit: twoHumbuckersThreeWayOneVolumeOneTone,
  },
  {
    id: 'two-humbuckers-3way-2v-2t',
    title: '2 humbuckers, 3-way toggle, 2 volumes, 2 tones',
    description: 'Les Paul style: individual volume and tone per pickup.',
    sourceUrl:
      'https://guitarelectronics.com/guitar-wiring-resources/2-pickup-guitar-wiring-diagrams/2-humbuckers-w-3-way-switch/2-volumes-2-tones/',
    createCircuit: twoHumbuckersThreeWayTwoVolumeTwoTone,
  },
  {
    id: 'two-humbuckers-3way-2v-2t-50s',
    title: '2 humbuckers, 3-way toggle, 2V/2T, 50s wiring',
    description: "Les Paul '50s wiring: tone taps off volume input, not wiper.",
    sourceUrl:
      'https://www.fralinpickups.com/diagram/gibson-les-paul-wiring-50s-wiring/',
    createCircuit: twoHumbuckersThreeWayTwoVolumeTwoTone50sWiring,
  },
  {
    id: 'two-humbuckers-3way-1v-1t-ppt',
    title: '2 humbuckers, 3-way toggle, 1V/1T, push-pull tone split',
    description:
      'PRS SE Custom 24 style: push-pull tone splits both humbuckers.',
    sourceUrl: 'https://www.cpearson.me.uk/2023/10/06/prs_se_24_wiring/',
    createCircuit: twoHumbuckersThreeWayOneVolumeOneTonePushPullTone,
  },
  {
    id: 'gretsch-setzer-hot-rod',
    title: 'Gretsch Setzer Hot Rod',
    description: '2 Filter\'Trons, 3-way toggle, master volume, no tone.',
    sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
    createCircuit: gretschSetzerHotRodCircuit,
  },
  {
    id: 'gretsch-g6122-country-gentleman',
    title: 'Gretsch G6122-1959 Country Gentleman',
    description: '2 Filter\'Trons, 3-way toggle, individual volumes, master volume, no tone.',
    sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
    createCircuit: gretschG6122CountryGentlemanCircuit,
  },
  {
    id: 'gretsch-tone-pot',
    title: 'Gretsch Tone Pot Circuit',
    description: '2 Filter\'Trons, 3-way toggle, individual volumes, master volume, master tone.',
    sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
    createCircuit: gretschTonePotCircuit,
  },
  {
    id: 'gretsch-tone-switch',
    title: 'Gretsch Tone Switch Circuit',
    description: '2 Filter\'Trons, 3-way toggle, individual volumes, master volume, two-way tone switch (approximated with single capacitor).',
    sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
    createCircuit: gretschToneSwitchCircuit,
  },
  {
    id: 'gretsch-tone-standby-switch',
    title: 'Gretsch Tone/Standby Switch Circuit',
    description: '2 Filter\'Trons, 3-way toggle, individual volumes, master volume, tone/standby switch (approximated; standby switching not representable).',
    sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
    createCircuit: gretschToneStandbySwitchCircuit,
  },
];
