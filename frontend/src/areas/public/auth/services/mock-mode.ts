// Modo de demonstração: enquanto a API não existe, o login e o cadastro respondem com dados de
// exemplo. Só liga em desenvolvimento (`npm run dev`) e com VITE_USE_MOCKS=true; no build de
// produção a expressão vira `false` e todo o código de exemplo sai do pacote.
export const MOCK_MODE: boolean =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true'
