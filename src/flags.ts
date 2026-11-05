export function readFlags(environment: Record<string, unknown>) {
  return {
    isPlaygroundEnabled: environment.VITE_ENABLE_PLAYGROUND !== 'false',
    isEditorEnabled: environment.VITE_ENABLE_EDITOR !== 'false',
    isDiagramFilesEnabled: environment.VITE_ENABLE_DIAGRAM_FILES !== 'false',
    isExtendedPartsEnabled: environment.VITE_ENABLE_EXTENDED_PARTS !== 'false',
    isWorkbenchUiEnabled: environment.VITE_ENABLE_WORKBENCH_UI !== 'false',
    isClearWiringEnabled: environment.VITE_ENABLE_CLEAR_WIRING !== 'false',
    isCompactGroundEnabled: environment.VITE_ENABLE_COMPACT_GROUND !== 'false',
    isSignalFlowEnabled: environment.VITE_ENABLE_SIGNAL_FLOW !== 'false',
  };
}

export const flags = readFlags(import.meta.env);
