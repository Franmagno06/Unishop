import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Máquinas lentas (OneDrive, antivírus, CI) precisam de mais que 1 s para a tela seguinte aparecer.
configure({ asyncUtilTimeout: 4000 })

// Sem `globals`, o Testing Library não limpa o DOM sozinho entre os testes.
afterEach(() => cleanup())

// Nenhum teste fala com a API de verdade (ela pode estar rodando na máquina e responder 401 ao token
// de teste, encerrando a sessão). Quem precisa de resposta simula o fetch dentro do próprio teste.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Sem rede nos testes')))
})
