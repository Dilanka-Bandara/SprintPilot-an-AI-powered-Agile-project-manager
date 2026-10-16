import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:5183', trace: 'retain-on-failure' },
  webServer: {
    command:
      'pnpm exec concurrently -k "pnpm --filter @sprintpilot/api dev" "pnpm --filter @sprintpilot/web dev --port 5183"',
    url: 'http://127.0.0.1:5183',
    env: {
      PORT: '4100',
      WORKSPACES_ENABLED: 'false',
      VITE_FIREBASE_API_KEY: '',
      API_PROXY_TARGET: 'http://127.0.0.1:4100',
      DEMO_DATA_PATH: `../../.data/e2e-${Date.now()}.json`,
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } },
    },
  ],
});
