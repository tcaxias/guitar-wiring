import { expect, it } from 'vitest';
import { readFlags } from './flags';

it('enables local evaluation by default and respects explicit disabled flags', () => {
  expect(readFlags({})).toEqual({
    isPlaygroundEnabled: true,
    isEditorEnabled: true,
    isDiagramFilesEnabled: true,
    isExtendedPartsEnabled: true,
    isWorkbenchUiEnabled: true,
    isClearWiringEnabled: true,
    isCompactGroundEnabled: true,
    isSignalFlowEnabled: true,
  });
  expect(
    readFlags({
      VITE_ENABLE_PLAYGROUND: 'false',
      VITE_ENABLE_EDITOR: 'false',
      VITE_ENABLE_DIAGRAM_FILES: 'false',
      VITE_ENABLE_EXTENDED_PARTS: 'false',
      VITE_ENABLE_WORKBENCH_UI: 'false',
      VITE_ENABLE_CLEAR_WIRING: 'false',
      VITE_ENABLE_COMPACT_GROUND: 'false',
      VITE_ENABLE_SIGNAL_FLOW: 'false',
    }),
  ).toEqual({
    isPlaygroundEnabled: false,
    isEditorEnabled: false,
    isDiagramFilesEnabled: false,
    isExtendedPartsEnabled: false,
    isWorkbenchUiEnabled: false,
    isClearWiringEnabled: false,
    isCompactGroundEnabled: false,
    isSignalFlowEnabled: false,
  });
});
