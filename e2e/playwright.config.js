// @ts-check
const { defineConfig, devices } = require('@playwright/test')

const CLIENT_PORT = 3000
const SERVER_PORT = 5000

/*
 * Chromium fake-media flags let getUserMedia resolve without hardware, so the
 * voice-note flow can be exercised for real: the fake device feeds a tone into
 * MediaRecorder and we get an actual encoded blob out.
 */
const mediaArgs = [
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
]

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1, // the suite drives two clients against one socket server
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${CLIENT_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    permissions: ['microphone'],
    launchOptions: { args: mediaArgs },
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: mediaArgs } },
      testIgnore: /mobile\.spec\.js/,
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        isMobile: true,
        hasTouch: true,
        launchOptions: { args: mediaArgs },
      },
      testMatch: /mobile\.spec\.js/,
    },
  ],

  webServer: [
    {
      command: 'node ../server/server.js',
      port: SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      // Force the on-disk upload path so tests never touch Cloudinary.
      env: { STORAGE: 'local', PORT: String(SERVER_PORT) },
    },
    {
      command: 'node static-server.js',
      port: CLIENT_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})
