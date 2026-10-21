import { defineConfig, devices } from '@playwright/test'

// Testes de fluxo (npm run test:e2e). Sobem o servidor de desenvolvimento sozinhos, já no modo de
// demonstração (API simulada), para os testes não dependerem de backend nem do seu .env.
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    env: { VITE_USE_MOCKS: 'true' },
  },
})
