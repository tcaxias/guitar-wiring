import { defineConfig, devices } from '@playwright/test';

const legacyFlags = {
  VITE_ENABLE_WORKBENCH_UI: 'false',
  VITE_ENABLE_PLAYGROUND: 'true',
  VITE_ENABLE_EDITOR: 'true',
  VITE_ENABLE_DIAGRAM_FILES: 'true',
  VITE_ENABLE_EXTENDED_PARTS: 'true',
  VITE_ENABLE_CLEAR_WIRING: 'true',
  VITE_ENABLE_SIGNAL_FLOW: 'true',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1100 },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -- --port 4177 --strictPort',
      url: 'http://127.0.0.1:4177',
      env: {
        ...legacyFlags,
        VITE_ENABLE_EXTENDED_PARTS: 'false',
      },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      env: legacyFlags,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      env: { ...legacyFlags, VITE_ENABLE_EDITOR: 'false' },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 4175 --strictPort',
      url: 'http://127.0.0.1:4175',
      env: {
        ...legacyFlags,
        VITE_ENABLE_PLAYGROUND: 'false',
      },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 4176 --strictPort',
      url: 'http://127.0.0.1:4176',
      env: {
        ...legacyFlags,
        VITE_ENABLE_DIAGRAM_FILES: 'false',
      },
      reuseExistingServer: false,
    },
    ...[
      { port: 4178 },
      { port: 4179, editor: 'false' },
      { port: 4181, files: 'false' },
      { port: 4182, extended: 'false' },
      { port: 4184, clear: 'false' },
      { port: 4186, compact: 'false' },
      { port: 4187, signal: 'false' },
    ].map(({ port, editor, files, extended, clear, compact, signal }) => ({
      command: `npm run dev -- --port ${port} --strictPort`,
      url: `http://127.0.0.1:${port}`,
      env: {
        VITE_ENABLE_WORKBENCH_UI: 'true',
        VITE_ENABLE_PLAYGROUND: 'true',
        VITE_ENABLE_EDITOR: editor ?? 'true',
        VITE_ENABLE_DIAGRAM_FILES: files ?? 'true',
        VITE_ENABLE_EXTENDED_PARTS: extended ?? 'true',
        VITE_ENABLE_CLEAR_WIRING: clear ?? 'true',
        VITE_ENABLE_COMPACT_GROUND: compact ?? 'true',
        VITE_ENABLE_SIGNAL_FLOW: signal ?? 'true',
      },
      reuseExistingServer: false,
    })),
  ],
});
