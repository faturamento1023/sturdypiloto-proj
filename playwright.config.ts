import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './tests',
  reporter: 'line',
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL, browserName: 'chromium' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'celular', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run start:homologacao',
    url: baseURL + '/api/saude',
    timeout: 60000,
    env: { PORT: '3100' },
  },
});
