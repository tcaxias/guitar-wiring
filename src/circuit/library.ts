import { createPart, presetCircuit, type Circuit } from './model';
import { factoryLayout } from './factoryLayout';
import sd1_phat_cat_1h_3way_toggle_2v_1t from './seymour-duncan-1-phat-cat-1h-3way-toggle-2v-1t.json' assert { type: 'json' };
import sd1_phat_cat_1v_1t from './seymour-duncan-1-phat-cat-1v-1t.json' assert { type: 'json' };
import sd1_phat_cat_1v from './seymour-duncan-1-phat-cat-1v.json' assert { type: 'json' };
import sd1h_1v_1t from './seymour-duncan-1h-1v-1t.json' assert { type: 'json' };
import sd1h_1v_1tpp_series_parallel from './seymour-duncan-1h-1v-1tpp-series-parallel.json' assert { type: 'json' };
import sd1h_1v_1tpp_spl from './seymour-duncan-1h-1v-1tpp-spl.json' assert { type: 'json' };
import sd1h_1vpp_series_parallel_1t from './seymour-duncan-1h-1vpp-series-parallel-1t.json' assert { type: 'json' };
import sd1h_1vpp_series_parallel from './seymour-duncan-1h-1vpp-series-parallel.json' assert { type: 'json' };
import sd1h_1vpp_split_1t from './seymour-duncan-1h-1vpp-split-1t.json' assert { type: 'json' };
import sd1h_1vpp_split from './seymour-duncan-1h-1vpp-split.json' assert { type: 'json' };
import sd1p90_1phat_cat_3way_toggle_2v_2t from './seymour-duncan-1p90-1phat-cat-3way-toggle-2v-2t.json' assert { type: 'json' };
import sd1s_1v_1t from './seymour-duncan-1s-1v-1t.json' assert { type: 'json' };
import sd1s_1v from './seymour-duncan-1s-1v.json' assert { type: 'json' };
import sd2_p90s_3way_toggle_2v_2t from './seymour-duncan-2-p90s-3way-toggle-2v-2t.json' assert { type: 'json' };
import sd2_phat_cats_3way_toggle_2v_1t from './seymour-duncan-2-phat-cats-3way-toggle-2v-1t.json' assert { type: 'json' };
import sd2_phat_cats_3way_toggle_2v_2t from './seymour-duncan-2-phat-cats-3way-toggle-2v-2t.json' assert { type: 'json' };
import sd2h_3way_blade_1v_1t from './seymour-duncan-2h-3way-blade-1v-1t.json' assert { type: 'json' };
import sd2h_3way_blade_1v_1tpp_split from './seymour-duncan-2h-3way-blade-1v-1tpp-split.json' assert { type: 'json' };
import sd2h_3way_blade_1v_2t from './seymour-duncan-2h-3way-blade-1v-2t.json' assert { type: 'json' };
import sd2h_3way_blade_1v_2tpp_split from './seymour-duncan-2h-3way-blade-1v-2tpp-split.json' assert { type: 'json' };
import sd2h_3way_blade_1v from './seymour-duncan-2h-3way-blade-1v.json' assert { type: 'json' };
import sd2h_3way_blade_1vpp_split_1t from './seymour-duncan-2h-3way-blade-1vpp-split-1t.json' assert { type: 'json' };
import sd2h_3way_blade_1vpp_split_2t from './seymour-duncan-2h-3way-blade-1vpp-split-2t.json' assert { type: 'json' };
import sd2h_3way_blade_2v_1t from './seymour-duncan-2h-3way-blade-2v-1t.json' assert { type: 'json' };
import sd2h_3way_blade_2v_1tpp_split from './seymour-duncan-2h-3way-blade-2v-1tpp-split.json' assert { type: 'json' };
import sd2h_3way_blade_2v_2t from './seymour-duncan-2h-3way-blade-2v-2t.json' assert { type: 'json' };
import sd2h_3way_blade_2v_2tpp_split from './seymour-duncan-2h-3way-blade-2v-2tpp-split.json' assert { type: 'json' };
import sd2h_3way_blade_2v from './seymour-duncan-2h-3way-blade-2v.json' assert { type: 'json' };
import sd2h_3way_blade_2vpp_series_parallel_2t from './seymour-duncan-2h-3way-blade-2vpp-series-parallel-2t.json' assert { type: 'json' };
import sd2h_3way_blade_2vpp_series_parallel from './seymour-duncan-2h-3way-blade-2vpp-series-parallel.json' assert { type: 'json' };
import sd2h_3way_blade_2vpp_split_1t from './seymour-duncan-2h-3way-blade-2vpp-split-1t.json' assert { type: 'json' };
import sd2h_3way_blade_2vpp_split_2t from './seymour-duncan-2h-3way-blade-2vpp-split-2t.json' assert { type: 'json' };
import sd2h_3way_blade_2vpp_split from './seymour-duncan-2h-3way-blade-2vpp-split.json' assert { type: 'json' };
import sd2h_3way_toggle_1v_1t from './seymour-duncan-2h-3way-toggle-1v-1t.json' assert { type: 'json' };
import sd2h_3way_toggle_1v_1tpp_split from './seymour-duncan-2h-3way-toggle-1v-1tpp-split.json' assert { type: 'json' };
import sd2h_3way_toggle_1v_2t from './seymour-duncan-2h-3way-toggle-1v-2t.json' assert { type: 'json' };
import sd2h_3way_toggle_1v from './seymour-duncan-2h-3way-toggle-1v.json' assert { type: 'json' };
import sd2h_3way_toggle_1vpp_split_1t from './seymour-duncan-2h-3way-toggle-1vpp-split-1t.json' assert { type: 'json' };
import sd2h_3way_toggle_2v_1t from './seymour-duncan-2h-3way-toggle-2v-1t.json' assert { type: 'json' };
import sd2h_3way_toggle_2v_2t from './seymour-duncan-2h-3way-toggle-2v-2t.json' assert { type: 'json' };
import sd2h_3way_toggle_2v from './seymour-duncan-2h-3way-toggle-2v.json' assert { type: 'json' };
import sd2h_3way_toggle_2vpp_series_parallel_2t from './seymour-duncan-2h-3way-toggle-2vpp-series-parallel-2t.json' assert { type: 'json' };
import sd2h_3way_toggle_2vpp_series_parallel from './seymour-duncan-2h-3way-toggle-2vpp-series-parallel.json' assert { type: 'json' };
import sd2h_3way_toggle_2vpp_splb from './seymour-duncan-2h-3way-toggle-2vpp-splb.json' assert { type: 'json' };
import sd2h_3way_toggle_2vpp_split_1t from './seymour-duncan-2h-3way-toggle-2vpp-split-1t.json' assert { type: 'json' };
import sd2h_3way_toggle_2vpp_split_2t from './seymour-duncan-2h-3way-toggle-2vpp-split-2t.json' assert { type: 'json' };
import sd2h_3way_toggle_2vpp_split from './seymour-duncan-2h-3way-toggle-2vpp-split.json' assert { type: 'json' };
import sd2mh_3way_toggle_2v_2t from './seymour-duncan-2mh-3way-toggle-2v-2t.json' assert { type: 'json' };
import sd2s_3way_blade_1v_1t from './seymour-duncan-2s-3way-blade-1v-1t.json' assert { type: 'json' };
import sdesquire_1h_ssp from './seymour-duncan-esquire-1h-ssp.json' assert { type: 'json' };
import sdesquire_standard from './seymour-duncan-esquire-standard.json' assert { type: 'json' };
import sdjazz_bass_standard from './seymour-duncan-jazz-bass-standard.json' assert { type: 'json' };
import sdmandolin_standard from './seymour-duncan-mandolin-standard.json' assert { type: 'json' };
import sdmusic_man_p_bass_2v_1t from './seymour-duncan-music-man-p-bass-2v-1t.json' assert { type: 'json' };
import sdmusic_man_passive_1v_1t from './seymour-duncan-music-man-passive-1v-1t.json' assert { type: 'json' };
import sdmusic_man_passive_2v_1t from './seymour-duncan-music-man-passive-2v-1t.json' assert { type: 'json' };
import sdp_bass_1s_1v_1t from './seymour-duncan-p-bass-1s-1v-1t.json' assert { type: 'json' };
import sdp_j_bass_standard from './seymour-duncan-p-j-bass-standard.json' assert { type: 'json' };
import sdp_j_stkj_2v_1t from './seymour-duncan-p-j-stkj-2v-1t.json' assert { type: 'json' };
import sdpassive_soapbars_2v_1t from './seymour-duncan-passive-soapbars-2v-1t.json' assert { type: 'json' };
import sdprecision_bass_standard from './seymour-duncan-precision-bass-standard.json' assert { type: 'json' };
import sdtele_1966 from './seymour-duncan-tele-1966.json' assert { type: 'json' };
import sdtele_1h_1s_3way_blade_1v_1t from './seymour-duncan-tele-1h-1s-3way-blade-1v-1t.json' assert { type: 'json' };
import sdtele_1h_1s_3way_blade_1v_1tpp_split from './seymour-duncan-tele-1h-1s-3way-blade-1v-1tpp-split.json' assert { type: 'json' };
import sdtele_1h_1s_3way_blade_1vpp_split_1t from './seymour-duncan-tele-1h-1s-3way-blade-1vpp-split-1t.json' assert { type: 'json' };
import sdtele_1s_1h_3b_2vpp_spln from './seymour-duncan-tele-1s-1h-3b-2vpp-spln.json' assert { type: 'json' };
import sdtele_1s_1h_3way_blade_1v_1tpp_split from './seymour-duncan-tele-1s-1h-3way-blade-1v-1tpp-split.json' assert { type: 'json' };
import sdtele_1s_1h_3way_blade_1vpp_split_1t from './seymour-duncan-tele-1s-1h-3way-blade-1vpp-split-1t.json' assert { type: 'json' };
import sdtele_1s_1h_3way_blade_2v from './seymour-duncan-tele-1s-1h-3way-blade-2v.json' assert { type: 'json' };
import sdtele_1th_1s_3b_2v from './seymour-duncan-tele-1th-1s-3b-2v.json' assert { type: 'json' };
import sdtele_1th_1s_3b_2vbpp_split from './seymour-duncan-tele-1th-1s-3b-2vbpp-split.json' assert { type: 'json' };
import sdtele_1th_1s_4way_1v_1t from './seymour-duncan-tele-1th-1s-4way-1v-1t.json' assert { type: 'json' };
import sdtele_2_stacks_3way_blade_1v_1t from './seymour-duncan-tele-2-stacks-3way-blade-1v-1t.json' assert { type: 'json' };
import sdtele_2h_3way_blade_1v_1tpp_split from './seymour-duncan-tele-2h-3way-blade-1v-1tpp-split.json' assert { type: 'json' };
import sdtele_2h_3way_blade_1vpp_split_1t from './seymour-duncan-tele-2h-3way-blade-1vpp-split-1t.json' assert { type: 'json' };
import sdtele_2s_3way_blade_2v from './seymour-duncan-tele-2s-3way-blade-2v.json' assert { type: 'json' };
import sdtele_2s_4way_1v_1t from './seymour-duncan-tele-2s-4way-1v-1t.json' assert { type: 'json' };
import sdtele_2th_4way_1v_1t from './seymour-duncan-tele-2th-4way-1v-1t.json' assert { type: 'json' };
import sdtele_standard from './seymour-duncan-tele-standard.json' assert { type: 'json' };

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
      permission:
        'Reference credited; reuse terms not specified. Circuit reconstructed from Gretsch PDF title and known Gretsch wiring conventions; verify against source PDF (Setzer-Hot-Rod_Circuit.pdf).',
    },
    parts: [
      {
        ...createPart('humbucker', 'neck'),
        label: "Neck Filter'Tron",
        x: 240,
        y: 90,
        skin: 'filtertron',
      },
      {
        ...createPart('humbucker', 'bridge'),
        label: "Bridge Filter'Tron",
        x: 240,
        y: 300,
        skin: 'filtertron',
      },
      {
        ...createPart('blade', 'selector'),
        label: '3-way toggle',
        x: 420,
        y: 200,
      },
      {
        ...createPart('volume', 'volume'),
        label: 'Master volume',
        x: 620,
        y: 200,
        resistanceKOhms: 500,
      },
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
      permission:
        'Reference credited; reuse terms not specified. Circuit reconstructed from Gretsch PDF title and known Gretsch wiring conventions; verify against source PDF (NoToneREV.pdf).',
    },
    parts: [
      {
        ...createPart('humbucker', 'neck'),
        label: "Neck Filter'Tron",
        x: 240,
        y: 90,
        skin: 'filtertron',
      },
      {
        ...createPart('humbucker', 'bridge'),
        label: "Bridge Filter'Tron",
        x: 240,
        y: 300,
        skin: 'filtertron',
      },
      {
        ...createPart('blade', 'selector'),
        label: '3-way toggle',
        x: 420,
        y: 200,
      },
      {
        ...createPart('volume', 'volume'),
        label: 'Neck volume',
        x: 600,
        y: 180,
        resistanceKOhms: 500,
      },
      {
        ...createPart('volume', 'volume-2'),
        label: 'Bridge volume',
        x: 780,
        y: 180,
        resistanceKOhms: 500,
      },
      {
        ...createPart('volume', 'master'),
        label: 'Master volume',
        x: 690,
        y: 320,
        resistanceKOhms: 500,
      },
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
      permission:
        'Reference credited; reuse terms not specified. Circuit reconstructed from Gretsch PDF title and known Gretsch wiring conventions; verify against source PDF (TonePotRev.pdf). Gretsch typically uses 500k audio pots and a .022 uF tone cap (modeled as capacitor value 22 = 22 nF).',
    },
    parts: [
      {
        ...createPart('humbucker', 'neck'),
        label: "Neck Filter'Tron",
        x: 240,
        y: 90,
        skin: 'filtertron',
      },
      {
        ...createPart('humbucker', 'bridge'),
        label: "Bridge Filter'Tron",
        x: 240,
        y: 300,
        skin: 'filtertron',
      },
      {
        ...createPart('blade', 'selector'),
        label: '3-way toggle',
        x: 420,
        y: 200,
      },
      {
        ...createPart('volume', 'volume'),
        label: 'Neck volume',
        x: 600,
        y: 180,
        resistanceKOhms: 500,
      },
      {
        ...createPart('volume', 'volume-2'),
        label: 'Bridge volume',
        x: 780,
        y: 180,
        resistanceKOhms: 500,
      },
      {
        ...createPart('volume', 'master'),
        label: 'Master volume',
        x: 690,
        y: 320,
        resistanceKOhms: 500,
      },
      {
        ...createPart('tone', 'tone'),
        label: 'Master tone',
        x: 690,
        y: 460,
        resistanceKOhms: 500,
      },
      {
        ...createPart('capacitor', 'capacitor'),
        label: 'Tone capacitor',
        x: 820,
        y: 340,
        value: 22,
      },
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
      permission:
        'Reference credited; reuse terms not specified. Circuit reconstructed from Gretsch PDF (ToneSwitchRev.pdf). LIMITATION: This diagram uses a two-way tone switch selecting between two caps (.012 uF and .0039 uF). The current model supports one capacitor; modeled here at value 12 (12 nF = .012 uF). Gretsch typically uses 500k audio pots.',
    },
    parts: [
      {
        ...createPart('humbucker', 'neck'),
        label: "Neck Filter'Tron",
        x: 240,
        y: 90,
        skin: 'filtertron',
      },
      {
        ...createPart('humbucker', 'bridge'),
        label: "Bridge Filter'Tron",
        x: 240,
        y: 300,
        skin: 'filtertron',
      },
      {
        ...createPart('blade', 'selector'),
        label: '3-way toggle',
        x: 420,
        y: 200,
      },
      {
        ...createPart('volume', 'volume'),
        label: 'Neck volume',
        x: 600,
        y: 180,
        resistanceKOhms: 500,
      },
      {
        ...createPart('volume', 'volume-2'),
        label: 'Bridge volume',
        x: 780,
        y: 180,
        resistanceKOhms: 500,
      },
      {
        ...createPart('volume', 'master'),
        label: 'Master volume',
        x: 690,
        y: 320,
        resistanceKOhms: 500,
      },
      {
        ...createPart('tone', 'tone'),
        label: 'Tone switch',
        x: 690,
        y: 460,
        resistanceKOhms: 500,
      },
      {
        ...createPart('capacitor', 'capacitor'),
        label: 'Tone capacitor',
        x: 820,
        y: 340,
        value: 12,
      },
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
      permission:
        'Reference credited; reuse terms not specified. Circuit reconstructed from Gretsch PDF (ToneSwitchStandBySwitchREV.pdf). LIMITATIONS: Two-way tone switch selecting between .012 uF and .0039 uF caps, plus a standby switch shorting output to ground. Neither switch type is representable; modeled here with one capacitor at value 12 (12 nF = .012 uF) and no standby switching.',
    },
    parts: [
      {
        ...createPart('humbucker', 'neck'),
        label: "Neck Filter'Tron",
        x: 240,
        y: 90,
        skin: 'filtertron',
      },
      {
        ...createPart('humbucker', 'bridge'),
        label: "Bridge Filter'Tron",
        x: 240,
        y: 300,
        skin: 'filtertron',
      },
      {
        ...createPart('blade', 'selector'),
        label: '3-way toggle',
        x: 420,
        y: 200,
      },
      {
        ...createPart('volume', 'volume'),
        label: 'Neck volume',
        x: 600,
        y: 180,
        resistanceKOhms: 500,
      },
      {
        ...createPart('volume', 'volume-2'),
        label: 'Bridge volume',
        x: 780,
        y: 180,
        resistanceKOhms: 500,
      },
      {
        ...createPart('volume', 'master'),
        label: 'Master volume',
        x: 690,
        y: 320,
        resistanceKOhms: 500,
      },
      {
        ...createPart('tone', 'tone'),
        label: 'Tone / standby switch',
        x: 690,
        y: 460,
        resistanceKOhms: 500,
      },
      {
        ...createPart('capacitor', 'capacitor'),
        label: 'Tone capacitor',
        x: 820,
        y: 340,
        value: 12,
      },
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
    description: "2 Filter'Trons, 3-way toggle, master volume, no tone.",
    sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
    createCircuit: gretschSetzerHotRodCircuit,
  },
  {
    id: 'gretsch-g6122-country-gentleman',
    title: 'Gretsch G6122-1959 Country Gentleman',
    description:
      "2 Filter'Trons, 3-way toggle, individual volumes, master volume, no tone.",
    sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
    createCircuit: gretschG6122CountryGentlemanCircuit,
  },
  {
    id: 'gretsch-tone-pot',
    title: 'Gretsch Tone Pot Circuit',
    description:
      "2 Filter'Trons, 3-way toggle, individual volumes, master volume, master tone.",
    sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
    createCircuit: gretschTonePotCircuit,
  },
  {
    id: 'gretsch-tone-switch',
    title: 'Gretsch Tone Switch Circuit',
    description:
      "2 Filter'Trons, 3-way toggle, individual volumes, master volume, two-way tone switch (approximated with single capacitor).",
    sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
    createCircuit: gretschToneSwitchCircuit,
  },
  {
    id: 'gretsch-tone-standby-switch',
    title: 'Gretsch Tone/Standby Switch Circuit',
    description:
      "2 Filter'Trons, 3-way toggle, individual volumes, master volume, tone/standby switch (approximated; standby switching not representable).",
    sourceUrl: 'https://www.gretschguitars.com/support/wiring-schematics/',
    createCircuit: gretschToneStandbySwitchCircuit,
  },
  {
    id: 'sd-1-phat-cat-1h-3way-toggle-2v-1t',
    title:
      'Seymour Duncan: 1 Phat Cat, 1 humbucker, 3-way toggle, 2 volumes, 1 tone',
    description: '1 Phat Cat, 1 humbucker, 3-way toggle, 2 volumes, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1PC_1H_3G_2V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd1_phat_cat_1h_3way_toggle_2v_1t)) as Circuit,
  },
  {
    id: 'sd-1-phat-cat-1v-1t',
    title: 'Seymour Duncan: 1 Phat Cat, 1 volume, 1 tone',
    description: '1 Phat Cat, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1PhatCat_1V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd1_phat_cat_1v_1t)) as Circuit,
  },
  {
    id: 'sd-1-phat-cat-1v',
    title: 'Seymour Duncan: 1 Phat Cat, 1 volume',
    description: '1 Phat Cat, 1 volume',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1PhatCat_1V.pdf',
    createCircuit: () => JSON.parse(JSON.stringify(sd1_phat_cat_1v)) as Circuit,
  },
  {
    id: 'sd-1h-1v-1t',
    title: 'Seymour Duncan: 1 humbucker, 1 volume, 1 tone',
    description: '1 humbucker, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1H_1V_1T.pdf',
    createCircuit: () => JSON.parse(JSON.stringify(sd1h_1v_1t)) as Circuit,
  },
  {
    id: 'sd-1h-1v-1tpp-series-parallel',
    title:
      'Seymour Duncan: 1 humbucker, 1 volume, 1 tone push/pull series/parallel',
    description: '1 humbucker, 1 volume, 1 tone push/pull series/parallel',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1H_1V_1TppSP.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd1h_1v_1tpp_series_parallel)) as Circuit,
  },
  {
    id: 'sd-1h-1v-1tpp-spl',
    title: 'Seymour Duncan: 1 humbucker, 1 volume, 1 tone push/pull coil split',
    description: '1 humbucker, 1 volume, 1 tone push/pull coil split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1H_1V_1TppSPL.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd1h_1v_1tpp_spl)) as Circuit,
  },
  {
    id: 'sd-1h-1vpp-series-parallel-1t',
    title:
      'Seymour Duncan: 1 humbucker, push/pull volume series/parallel, 1 tone',
    description: '1 humbucker, push/pull volume series/parallel, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1H_1VppSP_1T.rev2.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd1h_1vpp_series_parallel_1t)) as Circuit,
  },
  {
    id: 'sd-1h-1vpp-series-parallel',
    title: 'Seymour Duncan: 1 humbucker, 1 volume push/pull series/parallel',
    description: '1 humbucker, 1 volume push/pull series/parallel',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1H_1VppSP.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd1h_1vpp_series_parallel)) as Circuit,
  },
  {
    id: 'sd-1h-1vpp-split-1t',
    title: 'Seymour Duncan: 1 humbucker, push/pull volume coil split, 1 tone',
    description: '1 humbucker, push/pull volume coil split, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1H_1VppSPL_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd1h_1vpp_split_1t)) as Circuit,
  },
  {
    id: 'sd-1h-1vpp-split',
    title: 'Seymour Duncan: 1 humbucker, 1 volume push/pull coil split',
    description: '1 humbucker, 1 volume push/pull coil split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1H_1VppSPL.pdf',
    createCircuit: () => JSON.parse(JSON.stringify(sd1h_1vpp_split)) as Circuit,
  },
  {
    id: 'sd-1p90-1phat-cat-3way-toggle-2v-2t',
    title:
      'Seymour Duncan: 1 P90, 1 Phat Cat, 3-way toggle, 2 volumes, 2 tones',
    description: '1 P90, 1 Phat Cat, 3-way toggle, 2 volumes, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1P90_1PhatCat_3G_2V_2T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd1p90_1phat_cat_3way_toggle_2v_2t)) as Circuit,
  },
  {
    id: 'sd-1s-1v-1t',
    title: 'Seymour Duncan: 1 single coil, 1 volume, 1 tone',
    description: '1 single coil, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1S_1V_1T.pdf',
    createCircuit: () => JSON.parse(JSON.stringify(sd1s_1v_1t)) as Circuit,
  },
  {
    id: 'sd-1s-1v',
    title: 'Seymour Duncan: 1 single coil, 1 volume',
    description: '1 single coil, 1 volume',
    sourceUrl: 'https://www.seymourduncan.com/images/wiring-diagrams/1S_1V.pdf',
    createCircuit: () => JSON.parse(JSON.stringify(sd1s_1v)) as Circuit,
  },
  {
    id: 'sd-2-p90s-3way-toggle-2v-2t',
    title: 'Seymour Duncan: 2 P90s, 3-way toggle, 2 volumes, 2 tones',
    description: '2 P90s, 3-way toggle, 2 volumes, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/P90_Standard.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2_p90s_3way_toggle_2v_2t)) as Circuit,
  },
  {
    id: 'sd-2-phat-cats-3way-toggle-2v-1t',
    title: 'Seymour Duncan: 2 Phat Cats, 3-way toggle, 2 volumes, 1 tone',
    description: '2 Phat Cats, 3-way toggle, 2 volumes, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2PhatCat_3G_2V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2_phat_cats_3way_toggle_2v_1t)) as Circuit,
  },
  {
    id: 'sd-2-phat-cats-3way-toggle-2v-2t',
    title: 'Seymour Duncan: 2 Phat Cats, 3-way toggle, 2 volumes, 2 tones',
    description: '2 Phat Cats, 3-way toggle, 2 volumes, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2PhatCat_3G_2V_2T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2_phat_cats_3way_toggle_2v_2t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-1v-1t',
    title: 'Seymour Duncan: 2 humbuckers, 3-way blade, 1 volume, 1 tone',
    description: '2 humbuckers, 3-way blade, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_1V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_1v_1t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-1v-1tpp-split',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way blade, 1 volume, 1 tone push/pull split',
    description: '2 humbuckers, 3-way blade, 1 volume, 1 tone push/pull split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_1V_1TppSPL.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_1v_1tpp_split)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-1v-2t',
    title: 'Seymour Duncan: 2 humbuckers, 3-way blade, 1 volume, 2 tones',
    description: '2 humbuckers, 3-way blade, 1 volume, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_1V_2T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_1v_2t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-1v-2tpp-split',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way blade, 1 volume, 2 tones push/pull split',
    description: '2 humbuckers, 3-way blade, 1 volume, 2 tones push/pull split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_1V_2TppSPL.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_1v_2tpp_split)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-1v',
    title: 'Seymour Duncan: 2 humbuckers, 3-way blade, 1 volume',
    description: '2 humbuckers, 3-way blade, 1 volume',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_1V.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_1v)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-1vpp-split-1t',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way blade, push/pull volume coil split, 1 tone',
    description:
      '2 humbuckers, 3-way blade, push/pull volume coil split, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_1VppSPL_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_1vpp_split_1t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-1vpp-split-2t',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way blade, volume push/pull split, 2 tones',
    description: '2 humbuckers, 3-way blade, volume push/pull split, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_1VppSPL_2T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_1vpp_split_2t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-2v-1t',
    title: 'Seymour Duncan: 2 humbuckers, 3-way blade, 2 volumes, 1 tone',
    description: '2 humbuckers, 3-way blade, 2 volumes, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_2V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_2v_1t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-2v-1tpp-split',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way blade, 2 volumes, 1 tone push/pull split',
    description: '2 humbuckers, 3-way blade, 2 volumes, 1 tone push/pull split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_2V_1TppSPL.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_2v_1tpp_split)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-2v-2t',
    title: 'Seymour Duncan: 2 humbuckers, 3-way blade, 2 volumes, 2 tones',
    description: '2 humbuckers, 3-way blade, 2 volumes, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_2V_2T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_2v_2t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-2v-2tpp-split',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way blade, 2 volumes, 2 tones pp coil split',
    description: '2 humbuckers, 3-way blade, 2 volumes, 2 tones pp coil split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_2V_2TppSPL.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_2v_2tpp_split)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-2v',
    title: 'Seymour Duncan: 2 humbuckers, 3-way blade, 2 volumes',
    description: '2 humbuckers, 3-way blade, 2 volumes',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_2V.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_2v)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-2vpp-series-parallel-2t',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way blade, series/parallel volumes, 2 tones',
    description: '2 humbuckers, 3-way blade, series/parallel volumes, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_2VppSP_2T.pdf',
    createCircuit: () =>
      JSON.parse(
        JSON.stringify(sd2h_3way_blade_2vpp_series_parallel_2t),
      ) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-2vpp-series-parallel',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way blade, 2 volumes push/pull series/parallel',
    description:
      '2 humbuckers, 3-way blade, 2 volumes push/pull series/parallel',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_2VppSP.pdf',
    createCircuit: () =>
      JSON.parse(
        JSON.stringify(sd2h_3way_blade_2vpp_series_parallel),
      ) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-2vpp-split-1t',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way blade, 2 volumes, coil split, 1 tone',
    description: '2 humbuckers, 3-way blade, 2 volumes, coil split, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_2VppSPL_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_2vpp_split_1t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-2vpp-split-2t',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way blade, 2 volumes push/pull split, 2 tones',
    description:
      '2 humbuckers, 3-way blade, 2 volumes push/pull split, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_2VppSPL_2T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_2vpp_split_2t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-blade-2vpp-split',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way blade, 2 volumes push/pull coil split',
    description: '2 humbuckers, 3-way blade, 2 volumes push/pull coil split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3B_2VppSPL.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_blade_2vpp_split)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-1v-1t',
    title: 'Seymour Duncan: 2 humbuckers, 3-way toggle, 1 volume, 1 tone',
    description: '2 humbuckers, 3-way toggle, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_1V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_1v_1t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-1v-1tpp-split',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way toggle, 1 volume, 1 tone push/pull split',
    description: '2 humbuckers, 3-way toggle, 1 volume, 1 tone push/pull split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_1V_1TppSPL.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_1v_1tpp_split)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-1v-2t',
    title: 'Seymour Duncan: 2 humbuckers, 3-way toggle, 1 volume, 2 tones',
    description: '2 humbuckers, 3-way toggle, 1 volume, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_1V_2T.rev2.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_1v_2t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-1v',
    title: 'Seymour Duncan: 2 humbuckers, 3-way toggle, 1 volume',
    description: '2 humbuckers, 3-way toggle, 1 volume',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_1V.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_1v)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-1vpp-split-1t',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way toggle, push/pull volume coil split, 1 tone',
    description:
      '2 humbuckers, 3-way toggle, push/pull volume coil split, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_1VppSPL_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_1vpp_split_1t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-2v-1t',
    title: 'Seymour Duncan: 2 humbuckers, 3-way toggle, 2 volumes, 1 tone',
    description: '2 humbuckers, 3-way toggle, 2 volumes, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_2V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_2v_1t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-2v-2t',
    title: 'Seymour Duncan: 2 humbuckers, 3-way toggle, 2 volumes, 2 tones',
    description: '2 humbuckers, 3-way toggle, 2 volumes, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_2V_2T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_2v_2t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-2v',
    title: 'Seymour Duncan: 2 humbuckers, 3-way toggle, 2 volumes',
    description: '2 humbuckers, 3-way toggle, 2 volumes',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_2V.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_2v)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-2vpp-series-parallel-2t',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way toggle, series/parallel volumes, 2 tones',
    description: '2 humbuckers, 3-way toggle, series/parallel volumes, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_2VppSP_2T.pdf',
    createCircuit: () =>
      JSON.parse(
        JSON.stringify(sd2h_3way_toggle_2vpp_series_parallel_2t),
      ) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-2vpp-series-parallel',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way toggle, 2 volumes push/pull series/parallel',
    description:
      '2 humbuckers, 3-way toggle, 2 volumes push/pull series/parallel',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_2VppSP.pdf',
    createCircuit: () =>
      JSON.parse(
        JSON.stringify(sd2h_3way_toggle_2vpp_series_parallel),
      ) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-2vpp-splb',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way toggle, 2 volumes, bridge coil split',
    description: '2 humbuckers, 3-way toggle, 2 volumes, bridge coil split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_2VppSPLB.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_2vpp_splb)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-2vpp-split-1t',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way toggle, 2 volumes pp split, 1 tone',
    description: '2 humbuckers, 3-way toggle, 2 volumes pp split, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_2VppSPL_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_2vpp_split_1t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-2vpp-split-2t',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way toggle, 2 volumes pp split, 2 tones',
    description: '2 humbuckers, 3-way toggle, 2 volumes pp split, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_2VppSPL_2T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_2vpp_split_2t)) as Circuit,
  },
  {
    id: 'sd-2h-3way-toggle-2vpp-split',
    title:
      'Seymour Duncan: 2 humbuckers, 3-way toggle, 2 volumes push/pull coil split',
    description: '2 humbuckers, 3-way toggle, 2 volumes push/pull coil split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2H_3G_2VppSPL.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2h_3way_toggle_2vpp_split)) as Circuit,
  },
  {
    id: 'sd-2mh-3way-toggle-2v-2t',
    title:
      'Seymour Duncan: 2 mini-humbuckers, 3-way toggle, 2 volumes, 2 tones',
    description: '2 mini-humbuckers, 3-way toggle, 2 volumes, 2 tones',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2MH_3G_2V_2T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2mh_3way_toggle_2v_2t)) as Circuit,
  },
  {
    id: 'sd-2s-3way-blade-1v-1t',
    title: 'Seymour Duncan: 2 single coils, 3-way blade, 1 volume, 1 tone',
    description: '2 single coils, 3-way blade, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2S_3B_1V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sd2s_3way_blade_1v_1t)) as Circuit,
  },
  {
    id: 'sd-esquire-1h-ssp',
    title:
      'Seymour Duncan: Esquire, 1 humbucker, 3-way blade SSP, 1 volume, 1 tone',
    description: 'Esquire, 1 humbucker, 3-way blade SSP, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Esq_1H_SSP.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdesquire_1h_ssp)) as Circuit,
  },
  {
    id: 'sd-esquire-standard',
    title: 'Seymour Duncan: Standard Esquire',
    description: 'Standard Esquire',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Esq_Standard.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdesquire_standard)) as Circuit,
  },
  {
    id: 'sd-jazz-bass-standard',
    title: 'Seymour Duncan: Jazz Bass Standard',
    description: 'Jazz Bass Standard',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/JazzBass_Standard.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdjazz_bass_standard)) as Circuit,
  },
  {
    id: 'sd-mandolin-standard',
    title: 'Seymour Duncan: Mandolin, 1 single coil, 1 volume, 1 tone',
    description: 'Mandolin, 1 single coil, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Mandolin_Standard.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdmandolin_standard)) as Circuit,
  },
  {
    id: 'sd-music-man-p-bass-2v-1t',
    title: 'Seymour Duncan: Music Man and P-Bass, 2 volumes, 1 tone',
    description: 'Music Man and P-Bass, 2 volumes, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/1MM_1P_2V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdmusic_man_p_bass_2v_1t)) as Circuit,
  },
  {
    id: 'sd-music-man-passive-1v-1t',
    title: 'Seymour Duncan: Music Man passive, 1 volume, 1 tone',
    description: 'Music Man passive, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/MM_Passive_1V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdmusic_man_passive_1v_1t)) as Circuit,
  },
  {
    id: 'sd-music-man-passive-2v-1t',
    title: 'Seymour Duncan: Music Man passive, 2 volumes, 1 tone',
    description: 'Music Man passive, 2 volumes, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/MM_Passive_2V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdmusic_man_passive_2v_1t)) as Circuit,
  },
  {
    id: 'sd-p-bass-1s-1v-1t',
    title: 'Seymour Duncan: P-Bass, 1 single coil, 1 volume, 1 tone',
    description: 'P-Bass, 1 single coil, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Pbass_1S_1V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdp_bass_1s_1v_1t)) as Circuit,
  },
  {
    id: 'sd-p-j-bass-standard',
    title: 'Seymour Duncan: Standard PJ Bass, 2 volumes, 1 tone',
    description: 'Standard PJ Bass, 2 volumes, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/P_JBass_Standard.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdp_j_bass_standard)) as Circuit,
  },
  {
    id: 'sd-p-j-stkj-2v-1t',
    title: 'Seymour Duncan: P-Bass and Jazz Bass Stack, 2 volumes, 1 tone',
    description: 'P-Bass and Jazz Bass Stack, 2 volumes, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/P_J_STKJ_2V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdp_j_stkj_2v_1t)) as Circuit,
  },
  {
    id: 'sd-passive-soapbars-2v-1t',
    title: 'Seymour Duncan: Passive soapbars, 2 volumes, 1 tone',
    description: 'Passive soapbars, 2 volumes, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/2pSB_2V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdpassive_soapbars_2v_1t)) as Circuit,
  },
  {
    id: 'sd-precision-bass-standard',
    title: 'Seymour Duncan: Standard P-Bass, 1 volume, 1 tone',
    description: 'Standard P-Bass, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/PrecisionBass_Standard.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdprecision_bass_standard)) as Circuit,
  },
  {
    id: 'sd-tele-1966',
    title: 'Seymour Duncan: Tele 1966',
    description: 'Tele 1966',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_1966.pdf',
    createCircuit: () => JSON.parse(JSON.stringify(sdtele_1966)) as Circuit,
  },
  {
    id: 'sd-tele-1h-1s-3way-blade-1v-1t',
    title:
      'Seymour Duncan: Tele, 1 humbucker, 1 single coil, 3-way blade, 1 volume, 1 tone',
    description:
      'Tele, 1 humbucker, 1 single coil, 3-way blade, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_1H_1S_3B_1V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_1h_1s_3way_blade_1v_1t)) as Circuit,
  },
  {
    id: 'sd-tele-1h-1s-3way-blade-1v-1tpp-split',
    title:
      'Seymour Duncan: Tele, 1 humbucker, 1 single coil, 3-way blade, 1V1T split',
    description: 'Tele, 1 humbucker, 1 single coil, 3-way blade, 1V1T split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_1H_1S_3B_1V_1TppSPL.pdf',
    createCircuit: () =>
      JSON.parse(
        JSON.stringify(sdtele_1h_1s_3way_blade_1v_1tpp_split),
      ) as Circuit,
  },
  {
    id: 'sd-tele-1h-1s-3way-blade-1vpp-split-1t',
    title:
      'Seymour Duncan: Tele, 1 humbucker, 1 single coil, 3-way blade, 1Vpp split, 1T',
    description:
      'Tele, 1 humbucker, 1 single coil, 3-way blade, 1Vpp split, 1T',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_1H_1S_3B_1VppSPL_1T.pdf',
    createCircuit: () =>
      JSON.parse(
        JSON.stringify(sdtele_1h_1s_3way_blade_1vpp_split_1t),
      ) as Circuit,
  },
  {
    id: 'sd-tele-1s-1h-3b-2vpp-spln',
    title:
      'Seymour Duncan: Tele, 1 single coil, 1 humbucker, 3-way blade, 2VppSPLn',
    description: 'Tele, 1 single coil, 1 humbucker, 3-way blade, 2VppSPLn',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_1S_1H_3B_2VppSPLn.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_1s_1h_3b_2vpp_spln)) as Circuit,
  },
  {
    id: 'sd-tele-1s-1h-3way-blade-1v-1tpp-split',
    title:
      'Seymour Duncan: Tele, 1 single coil, 1 humbucker, 3-way blade, 1V1T split',
    description: 'Tele, 1 single coil, 1 humbucker, 3-way blade, 1V1T split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_1S_1H_3B_1V_1TppSPL.pdf',
    createCircuit: () =>
      JSON.parse(
        JSON.stringify(sdtele_1s_1h_3way_blade_1v_1tpp_split),
      ) as Circuit,
  },
  {
    id: 'sd-tele-1s-1h-3way-blade-1vpp-split-1t',
    title:
      'Seymour Duncan: Tele, 1 single coil, 1 humbucker, 3-way blade, 1Vpp split, 1T',
    description:
      'Tele, 1 single coil, 1 humbucker, 3-way blade, 1Vpp split, 1T',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_1S_1H_3B_1VppSPL_1T.pdf',
    createCircuit: () =>
      JSON.parse(
        JSON.stringify(sdtele_1s_1h_3way_blade_1vpp_split_1t),
      ) as Circuit,
  },
  {
    id: 'sd-tele-1s-1h-3way-blade-2v',
    title:
      'Seymour Duncan: Tele, 1 single coil, 1 humbucker, 3-way blade, 2 volumes',
    description: 'Tele, 1 single coil, 1 humbucker, 3-way blade, 2 volumes',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_1S_1H_3B_2V.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_1s_1h_3way_blade_2v)) as Circuit,
  },
  {
    id: 'sd-tele-1th-1s-3b-2v',
    title:
      'Seymour Duncan: Tele, 1 Tele humbucker, 1 single coil, 3-way blade, 2 volumes',
    description:
      'Tele, 1 Tele humbucker, 1 single coil, 3-way blade, 2 volumes',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_1TH_1S_3B_2V.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_1th_1s_3b_2v)) as Circuit,
  },
  {
    id: 'sd-tele-1th-1s-3b-2vbpp-split',
    title:
      'Seymour Duncan: Tele, 1 Tele humbucker, 1 single coil, 3-way blade, 2Vbpp split',
    description:
      'Tele, 1 Tele humbucker, 1 single coil, 3-way blade, 2Vbpp split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_1TH_1S_3B_2VbppSPL.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_1th_1s_3b_2vbpp_split)) as Circuit,
  },
  {
    id: 'sd-tele-1th-1s-4way-1v-1t',
    title:
      'Seymour Duncan: Tele, humbucker + single-coil, 4-way blade, 1 volume, 1 tone',
    description: 'Tele, humbucker + single-coil, 4-way blade, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_1TH_1S_4B_1V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_1th_1s_4way_1v_1t)) as Circuit,
  },
  {
    id: 'sd-tele-2-stacks-3way-blade-1v-1t',
    title: 'Seymour Duncan: Tele, 2 Tele Stacks, 3-way blade, 1 volume, 1 tone',
    description: 'Tele, 2 Tele Stacks, 3-way blade, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_2TSTK_3B_1V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_2_stacks_3way_blade_1v_1t)) as Circuit,
  },
  {
    id: 'sd-tele-2h-3way-blade-1v-1tpp-split',
    title:
      'Seymour Duncan: Tele, 2 humbuckers, 3-way blade, 1V1T push/pull split',
    description: 'Tele, 2 humbuckers, 3-way blade, 1V1T push/pull split',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_2H_3B_1V_1TppSPL.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_2h_3way_blade_1v_1tpp_split)) as Circuit,
  },
  {
    id: 'sd-tele-2h-3way-blade-1vpp-split-1t',
    title:
      'Seymour Duncan: Tele, 2 humbuckers, 3-way blade, 1Vpp split neck, 1T',
    description: 'Tele, 2 humbuckers, 3-way blade, 1Vpp split neck, 1T',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_2H_3B_1VppSPL_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_2h_3way_blade_1vpp_split_1t)) as Circuit,
  },
  {
    id: 'sd-tele-2s-3way-blade-2v',
    title: 'Seymour Duncan: Tele, 2 single coils, 2 volumes, 3-way blade',
    description: 'Tele, 2 single coils, 2 volumes, 3-way blade',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_2S_3B_2V.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_2s_3way_blade_2v)) as Circuit,
  },
  {
    id: 'sd-tele-2s-4way-1v-1t',
    title:
      'Seymour Duncan: Tele, 2 single-coils, 4-way blade, 1 volume, 1 tone',
    description: 'Tele, 2 single-coils, 4-way blade, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_2S_4B_1V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_2s_4way_1v_1t)) as Circuit,
  },
  {
    id: 'sd-tele-2th-4way-1v-1t',
    title: 'Seymour Duncan: Tele, 2 humbuckers, 4-way blade, 1 volume, 1 tone',
    description: 'Tele, 2 humbuckers, 4-way blade, 1 volume, 1 tone',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_2TH_4B_1V_1T.pdf',
    createCircuit: () =>
      JSON.parse(JSON.stringify(sdtele_2th_4way_1v_1t)) as Circuit,
  },
  {
    id: 'sd-tele-standard',
    title: 'Seymour Duncan: Standard Telecaster',
    description: 'Standard Telecaster',
    sourceUrl:
      'https://www.seymourduncan.com/images/wiring-diagrams/Tele_Standard.pdf',
    createCircuit: () => JSON.parse(JSON.stringify(sdtele_standard)) as Circuit,
  },
];
