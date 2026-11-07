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
  'eb8bba24a3454713bdde5beae5839709fb950b1a68bd0225da3186b10799545d',
  '26c4f87652bf778538704ff636b50e8f5dcbbee28bef144730769afd8c69eb4e',
  'a31fcbfecba0e0b6cb3aa57c870d24480beb1aa82abde7ab411e8f95fd6f3bf8',
  '0645cd15cad153b79d530255accc0db04988a3682c6032aa711f9a7a69488592',
  '394863b4d332330f4bcc81aa22017a7240a3394d6e0b6b68cceb92df65c5006f',
  '2ccb90e27ada4fa53421166c3d3466163e34064cc7d3aeb52b8e7f06cbd71f58',
  '8c22e7bf0419f9677f3b5700e5787961443e725a0e5ef67c74733d864bb98856',
  'fdbfed559a7deba0fdd97df2331b017edf098ce47882c7069d3e1735b73c7091',
  '37963753d37067045a6ae3d68afb53bd93967ce50aa806f8d01588e7091aff5a',
  '6b5b7c882ecb6047af7330b26f9dae183b1e7cabe1b2f5d59227be03794710e3',
  '174de0bdef2f9eae81aa3e46c8aa46da9dabaf40bb4bf71243beb6b0d6f24ae0',
  '49a5f6214835c9a0df8c082b5263fbcef754610964095fd3e4e40806021b7fe8',
  '437911837f432717b4d67c47ce4a15fd3e0d4f3c109a38aca63e5b69509df8b8',
  '8a663a9a007fd21c22473736e9cd4f10a22de681f1e713129c78ac981fba75de',
  'f9d6ec5cc38e925996396924670257266e4984f9840919a8f0f9a05e9cac1f5b',
  'ba0e52cbc2efd1ca07d55b344462fd776d8714c616f58c9a40c1726a7fea2e78',
  'be6cf4856485c7dc877cc47050127ec00e1cbc71e34047e668212b754f555c1d',
  '770411050c521a0f8e9dcc0626b2bbc8516f317a19a6e2086e2aaef58afbfe8b',
  '4aa229bf4c3b850f2310de047cdca6ccf1f4cf8d0375b3f2b916a2819ec8f0a8',
  'a8c965e591001711d3849658eaebf5b1ae0874f5e01fc5b698a4ad5f744d2ef4',
  'd3d965cc3f00b23ac4e8e4df6f1e4758e34e5fdac9cbbe665fb7d87ee366be3b',
  'bf9456f3f8d7d51e5f39610152ab1149d556e3bdfb7d052a562feff836061c5c',
  '5243d1a6eabbcf4a1dc2fa3539a75e1aee86a2b2500eed6dae39ca7b1f951d2a',
  '3760b84ef0d8e77b6dece6eb2fbf987fb26efec975d0e4ac3d75f1f2893576b0',
  '29d403b7b1ae3f2703b457ebb87f59b9489a78748b770006468b4f1a114f99e3',
  '46f8530c83bd19bff626aa058108d586d77a0819bf4abf664e552713e048c0a6',
  '72f1aea53c07906f6448701f43acb662eb0a77eef477b606a396c468a7949f58',
  '41a83720c4c299f3626104e6b781808f52d95c634dcbd766efb4dc96fa584481',
  '65486016c6b63c66df00e1aac9135a930d6fc75d49705ab0222e125bbb702e29',
  'd7855229d962391951e6e175e8c055abd92b013becc0e56fe47963964c1ee9f2',
  'fe259f12eb44e01613daefef205439238850672e09616743b0c6473815d65469',
  '857a2a4bdd5e3c221300278d66bac6bf05d85fd4c0615072205a558e328bc296',
  '9c5e116c7264d446c062083338e78bf5a856c1d6204bfcabeabee0d5daf04d77',
  '268645fc94f33587f078292c6a0d5a7fb1e60e530929b7f5c0a6cf51e4287b36',
  '3c3774e6e53897a60efba45b7d8732a7a815cc018e4d2182577831be3c36311f',
  'ae21386100743e2cfa44f882b4fab3cc9c9b8ce31bdd8c1b80a6331e015faef8',
  'daa184d6036d364c84dc6fd7e195ca7cf3df953cac5ab0dafb6e38298ee12a91',
  '7c33ba244324d9e2162439959a4487668556e5368dfd2420f4f0aad7bb3c5168',
  'c28f4b9ae432f502da77d02b4b7e68e36e021f14526629dd51faeb8fe2fdd2c2',
  '0b1110a78e20d7e44102696fc2915732561b39b728ffde9dea5de22de9ce56d6',
  'd2cc791d7eff359d2dbd85d632b7c087ccb101da060db42e4310fbb6596409b6',
  '116a40ea6dd42772f0a1bc79ac7c0fa5f7da63b04c8480047de39f9430d66000',
  '19bd132f55e594a1b40a7b740da06fa53973566d388b97eb5e90bd204076fef5',
  'abb63874e4a5447e474760e447ca7c907c58479e69b5587c85db93ce992f3328',
  '6d41d33ebf11403c8811d0c35176171c85d35dfc1e5cb42aaf2a98afc5ca3841',
  'ddb2d4c3ca5b3792e3d6b99d4b1e859a16aeeefb7d8d0d70eaf9261db6f03859',
  '0b8f80195822aec15d0c3f0dc54ef82473e0bb9baf194de66f0c90632e1cd6e8',
  '8440a31d24e7acadafc780dd8ea3fcc383c9e72aa7670c489df5c90ef6e40604',
  '09d7cadf0cc0fb0621194cffc17e9210d693503c7b0966943a08f33d0a36ff8e',
  '9b925aad264a9f52028a36246d590b00c86edc44ba4433b6620e1f75611adb5d',
  'd6d92ccf8edaf25ce1a082e14430f64ba3b0b777f64ba3b150fe597ccbc76fe1',
  '772a5a574ef438e72635ae77d28b17b3b3c4e8256591f3ae294dbc141b6e305c',
  '687b8e553c130066bd4dabb80ae52c1df2446f96cdad1233c49989e7564c3d50',
  '450148156141b204e953d950adc1a5037dd6cac6e5e2fc5f933f46f8329d2fdc',
  '278a85d1e290dd645be22a10421977a3d3c837162b346e889bf9566914252247',
  '6cee1f1f8c65122ed2afa80de96f887308caff53be2e248646821dde6d400c37',
  '139c9886fd2f09c1f1350f0021e7fe2c7faff7281630a987ec8b849a9f2d00cd',
  '81eaf606ab5ab3b363bb13e140c2e4bbb9c9c90537ec98cfec565b9b6aad9b35',
  'e139a59a345a56fc831651ee9e74f649f34c5d1307ce4e2c9c51a4990ce1f89b',
  '93417d010b272c55f4251fa3e9eefa361290502ef6a929beb9b5bc620c7173f9',
  '880fe86f99c17208c89229a5039ec1dd83f23d432149754b5d8ce41405f4e03e',
  '8ba49be1f3b7d38c81203452285c77409d28a0092611376ec0c989f1366c2d4a',
  'f04d2863565f3deb6da0af89089abd9a1b385745638ae155b03a2c5d6cb225f3',
  'af69b7037af37b3f43087da2fd3b249bd68810378d977d4c5e94ecdd42d8b729',
  'be958668315f2df5ccc082543042986cd8f74edc311e58f5ff1abb1e7130613c',
  '59e2ca387c2765763966f0a663d3d17a77e765f74d7aa057077abc1db4f41e16',
  '88a7aff94c185d5fcdbc369a165d44514f8a7e18459ce448408242f6e4db7404',
  '896a4db1abd4ca5861bf47b0083d0c8c29c4ffcd540fab10c2b8e57273054fd5',
  '07b267310cc92af1756143f2dca4937820d2727ae3fdafd16f9ecea7dbb90825',
  '62000cb26d81f04f58034bd9cd8d3fff92bc87b40bd919a0d5ff4e84d01461d1',
  '1ae11b7232a97bd0681e06d116e77c6d9a599df40127603039cab46d45750d52',
  '254fbad6752d0919abbf7b343bcfff7b79da3546023152b33ab96a279b7327ae',
  '3cb23fe007be95185f46ee3e098649d0f4ad6a2302a22cd3f29b616994c8defa',
  '8beb6d2a3e9c4b6bbbaa94b9b25aed3b5384f0376a7595de91eb13bb41d0249f',
  'fa245d9c60764cbb0358820ad9257dbc326f5516ba775043fc4081320b51b322',
  '00f54827d84a740d8d85c7e71ef0369ebe778434f7d361861308b26e10aa7b0f',
  'd8661e74a1572ecb446bdc06b309917f0c80d86268a7a9719408249f77355148',
  'b120a8e32cff929d3a4ae221d672c455ab1ac49a7affd9f473e8af2a3139fcb2',
  '6cc71e79e9d9dc0a4c1a9c54ee5b6658841d1aa170404e45ff47bf855af6a50d',
  'e32881c28e895a575835c40ab46a7a659dd38f3a3a8214e25d6ecd1a6800d09d',
  '3dac07093d33e24317664b16ca3ee34e4ea28ad0bf0d3397c536e0255b1a58b5',
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
    // SD JSONs keep raw JSON positions (factory positions are never applied),
    // so position assertions only make sense for factory-authored entries.
    if (!example.id.startsWith('sd-')) {
      it(`${example.id} keeps neck-up pickups beside controls, with return and output at the bottom`, () => {
        const circuit = example.createCircuit();
        const has = (id: string) =>
          circuit.parts.some((part) => part.id === id);
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
  }
});
