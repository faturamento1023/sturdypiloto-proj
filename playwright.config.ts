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
  webServer: [
    {
      command: 'node tests/supabase-auth-fixture.mjs',
      url: 'http://127.0.0.1:54329/health',
      timeout: 15000,
    },
    {
      command: 'npm run start:homologacao',
      url: baseURL + '/api/saude',
      timeout: 60000,
      env: {
        PORT: '3100',
        PILOTO_ORIGEM: baseURL,
        SUPABASE_URL: 'http://127.0.0.1:54329',
        SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_piloto_teste',
      },
    },
  ],
});
