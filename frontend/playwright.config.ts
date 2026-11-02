import { defineConfig, devices } from '@playwright/test'

// Testes de fluxo (npm run test:e2e). Sobem o servidor de desenvolvimento sozinhos, já no modo de
// demonstração (API simulada), para os testes não dependerem de backend nem do seu .env. Porta própria
// (5199) e sem reaproveitar servidor: o seu `npm run dev` (5173), com a API real, nunca entra nos testes.
const PORT = 5199

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    // Sem Client ID o botão do Google fica desabilitado e nenhum script externo carrega nos testes.
    env: { VITE_USE_MOCKS: 'true', VITE_GOOGLE_CLIENT_ID: '' },
  },
})
