import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { exampleLibrary } from './library';
import { partScale } from './model';

const baselineGraphs = [
  '7958eda4dd0b247642761102a361d5fc6236373428939c07df95804a8f2aeffa',
  'fe8e60e7562df5e6ad1d9ebf6e3094c7a86477253f4e1c7196ab082768f92237',
  'a3e8f5787a31bcacbb5cb455d356d1bd99078e7147d3b54e7485ee9f1f71e1a7',
  '937edb5ae1dac9541be2a0cee5135644a21c63e5015fb988f0192dacd4a41550',
  '27b6d411c3c1fedd623b3cd1d8a44ea7f5e483f766183d1cd1d73a4057b032a0',
  'b40930383abc614e2eff7adf1697964d2fa69cd0404a80b44d154a5ccb0e36d8',
  '515b0b1406a464e63f75636f819f5ad08d7961834bb6a7cbc8981d7b01e87083',
  'd62de661b856265a9abece89c5cef49cf24071bc0a2ab5b5c7a78f61bd2d025e',
  '013c58c20ecdf4590d6666bc2edf74494fdc449e8af29e1974f7dce16ed5b01c',
  'e1a902529bce91473402a12b5d695cedb59297a9d0270d293bb6c87448da8e1d',
  '4521646e8efd34287019d443e9c0ba940b2be7bd96e325ed01db7df139901bd6',
  '8d0400cee55e6333bb13eb3aaceb45d99f2caba7d7f1fd532a1b604b4ff08164',
  '5ec29ed62d6e05048b613ebaaa51dd20369ed0e3ddfe085a94f326c0c1fcb07d',
  '1d440c92c223792054ae17a7f14684b42c366b71f3d31046f0162b426ab3f559',
  '99d8a474bb86f5cc2e99754659a671a31148d7b9b754bbacf9b425501bb78a0c',
  'ba9a7f00b45f173c41d9992dbc36d13466df8e83e9175afc47ec41ef712d7ce4',
];

describe('factory guitar layouts', () => {
  for (const [index, example] of exampleLibrary.entries()) {
    it(`${example.id} changes only factory positions, not the existing graph or metadata`, () => {
      const circuit = example.createCircuit();
      const graph = {
        ...circuit,
        parts: circuit.parts.map((part) =>
          Object.fromEntries(
            Object.entries(part).filter(([key]) => key !== 'x' && key !== 'y'),
          ),
        ),
      };
      expect(
        createHash('sha256').update(JSON.stringify(graph)).digest('hex'),
      ).toBe(baselineGraphs[index]);
      expect(example.createCircuit()).toEqual(circuit);
    });
    it(`${example.id} keeps neck-up pickups beside controls, with return and output at the bottom`, () => {
      const circuit = example.createCircuit();
      const has = (id: string) => circuit.parts.some((part) => part.id === id);
      const part = (id: string) =>
        circuit.parts.find((part) => part.id === id)!;
      // Only entries with both pickups share their neck-up column.
      if (has('neck') && has('bridge')) {
        expect(part('neck').x).toBe(part('bridge').x);
        expect(part('neck').y).toBeLessThan(part('bridge').y);
      }
      // Switch/control row only applies to entries that have them.
      if (has('selector') && has('volume') && has('tone')) {
        expect(part('selector').x).toBe(part('volume').x);
        expect(part('volume').x).toBe(part('tone').x);
        expect(part('selector').x).toBeGreaterThan(
          part('neck').x + 180 * partScale,
        );
        expect(part('selector').y).toBeLessThan(part('volume').y);
        expect(part('volume').y).toBeLessThan(part('tone').y);
      }
      if (has('ground')) {
        expect(part('ground').y).toBe(
          Math.max(...circuit.parts.map((part) => part.y)),
        );
        if (has('jack')) expect(part('jack').y).toBe(part('ground').y);
        if (has('bridge')) {
          expect(part('ground').y).toBeGreaterThan(
            part('bridge').y + 150 * partScale,
          );
        }
      }
      if (example.id === 'split-humbuckers') {
        expect(
          circuit.parts.filter(
            (part) =>
              part.kind.includes('volume') || part.kind.includes('tone'),
          ),
        ).toHaveLength(2);
        expect(part('volume').y + 297 * partScale).toBeLessThan(
          part('tone').y - 24 * partScale,
        );
      }
      if (example.id === 'varitone-tele')
        expect(part('varitone').y + 170 * partScale).toBeLessThan(
          part('capacitor').y - 24 * partScale,
        );
    });
  }
});
