import { DAY, DEMO_NOW, wait } from '../../shared/services/mock-utils'
import type { SupportRequest, SupportRequestStatus } from '../types/support.types'

// Solicitações de exemplo no formato assumido de GET /admin/support-requests e
// PATCH /admin/support-requests/:id (rotas ainda fora do backend.md §9). Em memória: o que o admin
// muda some ao recarregar. Quando a API existir, só este arquivo muda.
const ago = (days: number) => new Date(DEMO_NOW - days * DAY).toISOString()

let requests: SupportRequest[] = [
  {
    id: 1,
    type: 'refund',
    status: 'open',
    userId: 5,
    userName: 'João Pereira',
    userEmail: 'joao.pereira@edu.unifor.br',
    orderId: 9001,
    message: 'Paguei por Pix, mas o vendedor não responde há dois dias. Quero o reembolso.',
    createdAt: ago(0.2),
  },
  {
    id: 2,
    type: 'order_cancellation',
    status: 'open',
    userId: 6,
    userName: 'Larissa Moura',
    userEmail: 'larissa.moura@edu.unifor.br',
    orderId: 9002,
    message: 'Fiz o pedido sem querer e gostaria de cancelar antes de combinar a retirada.',
    createdAt: ago(1),
  },
  {
    id: 3,
    type: 'refund',
    status: 'in_review',
    userId: 4,
    userName: 'Carla Mendes',
    userEmail: 'carla.mendes@edu.unifor.br',
    orderId: 9010,
    message: 'O item veio diferente do anúncio (faltavam páginas). Peço o estorno.',
    createdAt: ago(3),
  },
  {
    id: 4,
    type: 'other',
    status: 'open',
    userId: 7,
    userName: 'Pedro Alves',
    userEmail: 'pedro.alves@edu.unifor.br',
    orderId: null,
    message: 'Não consigo alterar o WhatsApp do meu perfil. Aparece erro ao salvar.',
    createdAt: ago(4),
  },
  {
    id: 5,
    type: 'order_cancellation',
    status: 'resolved',
    userId: 3,
    userName: 'Bruno Sales',
    userEmail: 'bruno.sales@edu.unifor.br',
    orderId: 9005,
    message: 'O vendedor pediu para cancelar porque o item acabou.',
    createdAt: ago(8),
  },
]

export async function listSupportRequests(): Promise<SupportRequest[]> {
  await wait()
  // Abertas e em análise primeiro; dentro de cada grupo, as mais recentes no topo.
  const rank = (status: SupportRequestStatus) => (status === 'resolved' ? 1 : 0)
  return [...requests].sort(
    (a, b) => rank(a.status) - rank(b.status) || b.createdAt.localeCompare(a.createdAt),
  )
}

export async function updateSupportRequestStatus(id: number, status: SupportRequestStatus): Promise<void> {
  await wait()
  requests = requests.map((request) => (request.id === id ? { ...request, status } : request))
}
