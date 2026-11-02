import { MOCK_MODE } from '../../../../shared/lib/mock-mode'
import type { SupportRequest, SupportRequestStatus } from '../types/support.types'

// Solicitações de suporte são protótipo (fora do MVP, Regras §8): não há tabela nem rota. Em modo de
// demonstração (MOCK_MODE) vêm os dados de exemplo de `support.mock.ts`; com a API real a lista vem
// vazia, para o painel nunca mostrar nome e e-mail inventados. O `import.meta.env.DEV` escrito aqui é o
// que deixa o Vite apagar o exemplo do build de produção. A tela fica até a equipe decidir o destino.
export async function listSupportRequests(): Promise<SupportRequest[]> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./support.mock')).listSupportRequests()
  return []
}

export async function updateSupportRequestStatus(id: number, status: SupportRequestStatus): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) {
    return (await import('./support.mock')).updateSupportRequestStatus(id, status)
  }
  // Sem rota no backend: a lista real é sempre vazia, então não há solicitação para atualizar.
}
