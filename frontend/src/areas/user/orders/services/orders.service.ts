import { ApiError } from '../../../../shared/lib/api'
import type { BuyerOrder } from '../types/order.types'

// Dados de exemplo (os do Figma, tela 05c) no formato assumido de GET /orders?role=buyer
// (backend.md §9). Quando a API existir, só este arquivo muda. A lista é mantida em memória para
// "Cancelar pedido" e "Confirmar recebimento" mudarem o estado de verdade durante a demonstração.
const DELAY_MS = 250
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let orders: BuyerOrder[] = [
  {
    id: 417,
    code: 'UNI-2026-0417',
    listingTitle: 'Cálculo I — Guidorizzi, vol. 1',
    listingDescription: 'Livro em ótimo estado, 5ª edição, sem rasuras e com poucas marcações a lápis.',
    imageUrl: null,
    priceInCents: 4500,
    status: 'paid',
    negotiation: 'site_payment',
    createdAt: '2026-09-24T15:00:00Z',
    seller: { name: 'João Paulo', whatsapp: '85991234567' },
  },
  {
    id: 405,
    code: 'UNI-2026-0405',
    listingTitle: 'Física I — Halliday, 10ª ed.',
    listingDescription: 'Volume 1 completo, capa com leve desgaste. Acompanha lista de exercícios resolvidos.',
    imageUrl: null,
    priceInCents: 6000,
    status: 'pickup_arranged',
    negotiation: 'site_payment',
    createdAt: '2026-09-22T13:00:00Z',
    seller: { name: 'Pedro Cândido', whatsapp: '85998724657' },
  },
  {
    id: 371,
    code: 'UNI-2026-0371',
    listingTitle: 'Apostila de Anatomia Humana',
    listingDescription: 'Apostila completa do 1º semestre de Medicina, com esquemas coloridos e resumos.',
    imageUrl: null,
    priceInCents: 2500,
    status: 'completed',
    negotiation: 'whatsapp',
    createdAt: '2026-09-15T17:00:00Z',
    seller: { name: 'Pedro Ferrari', whatsapp: '85987654321' },
  },
]

// RN-PED-06: do mais recente ao mais antigo.
export async function getMyOrders(signal?: AbortSignal): Promise<BuyerOrder[]> {
  await wait(DELAY_MS)
  signal?.throwIfAborted()
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function update(id: number, allowedFrom: BuyerOrder['status'][], to: BuyerOrder['status']) {
  const order = orders.find((item) => item.id === id)
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.')
  if (!allowedFrom.includes(order.status)) {
    throw new ApiError(409, 'INVALID_ORDER_STATE', 'O pedido mudou de estado. Atualize a página.')
  }
  orders = orders.map((item) => (item.id === id ? { ...item, status: to } : item))
}

// RN-PED-12: o comprador cancela só pedido Pendente ou Em negociação.
export async function cancelOrder(id: number): Promise<void> {
  await wait(DELAY_MS)
  update(id, ['pending', 'negotiating'], 'cancelled')
}

// RN-PED-08: com a retirada combinada, o comprador confirma o recebimento e o pedido conclui.
export async function confirmReceipt(id: number): Promise<void> {
  await wait(DELAY_MS)
  update(id, ['pickup_arranged'], 'completed')
}
