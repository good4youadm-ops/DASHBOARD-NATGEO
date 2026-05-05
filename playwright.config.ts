import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:   './e2e',
  testMatch: '**/*.spec.ts',
  timeout:   30_000,
  retries:   0,
  workers:   1,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/report', open: 'never' }],
  ],

  use: {
    baseURL:          'http://127.0.0.1:8788',
    headless:         true,
    viewport:         { width: 1440, height: 900 },
    screenshot:       'on',
    video:            'off',
    trace:            'off',
    actionTimeout:    8_000,
    navigationTimeout: 15_000,
    ignoreHTTPSErrors: true,
  },

  webServer: {
    command:           'node e2e/static-server.mjs',
    url:               'http://127.0.0.1:8788',
    reuseExistingServer: !process.env.CI,
    timeout:           10_000,
  },

  projects: [
    {
      name: 'chromium',
      use:  { ...devices['Desktop Chrome'] },
    },
  ],
});
