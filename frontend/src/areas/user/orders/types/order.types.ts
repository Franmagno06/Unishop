// Estados do pedido (Regras §4). No banco os valores são em português (`pendente`, `pago`...);
// aqui seguem em inglês, como o resto do código. O mapeamento fica com o backend (bd.md §7).
export type OrderStatus = 'pending' | 'paid' | 'pickup_arranged' | 'completed' | 'negotiating' | 'cancelled'

// Por que um pedido foi cancelado: vencimento (RN-PAG-12), estoque que acabou (RN-PAG-08) ou
// anúncio que saiu do ar (RN-PAG-14). Os dois últimos acontecem depois do pagamento aprovado.
export type CancelReason = 'expired' | 'out_of_stock' | 'listing_unavailable'

// Formato assumido de GET /orders/:id (backend.md §9.5; o openapi.yaml ainda não existe).
// O pedido congela produto, imagem, quantidade, preço e taxa (RN-PED-01). Dinheiro em centavos.
export type Order = {
  id: number
  number: string // número exibido na confirmação (RN-PED-03), ex.: "UNI-2026-0417"; o formato não está definido
  status: OrderStatus
  listingId: number
  title: string
  imageUrl: string | null
  seller: { name: string; whatsapp: string } // WhatsApp só em rota autenticada (RN-PER-04)
  quantity: number
  unitPriceInCents: number
  feeInCents: number // taxa de serviço: R$ 0,00 por enquanto (RN-PED-02)
  totalInCents: number
  createdAt: string
  expiresAt: string // pedido pendente sem pagamento aprovado vence em 30 minutos (RN-PAG-12)
  cancelReason: CancelReason | null
  refunded: boolean // pagamento aprovado e depois estornado (RN-PAG-13)
}

// Cobrança Pix (POST /payments/pix): código "copia e cola" e validade de 30 minutos (RN-PAG-04).
export type PixCharge = {
  code: string
  expiresAt: string
}

// Dados que o formulário de cartão entrega. Na API real o navegador troca isso por um token do
// Mercado Pago e só o token vai ao backend (RN-PAG-02); o Unishop nunca recebe nem guarda o cartão.
export type CardPaymentInput = {
  number: string
  holder: string
  expiry: string
  cvv: string
}

export type NewOrder = {
  listingId: number
  quantity: number
// Estados do pedido (Regras §3, banco `pedido.status_pedido`): o código escreve em inglês e o
// Prisma faz a ponte com os valores em português (pendente, pago, retirada_combinada...).
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'pickup_arranged'
  | 'completed'
  | 'negotiating'
  | 'cancelled'

// Forma de negociação do pedido: pagamento pelo site ou conversa pelo WhatsApp (RN-PED-04).
export type Negotiation = 'site_payment' | 'whatsapp'

// Pedido na visão do comprador (Meus pedidos, RN-PED-06). O pedido congela o produto, o preço e o
// vendedor (RF017.12), por isso os dados do anúncio vêm dentro dele.
export type BuyerOrder = {
  id: number
  code: string // "UNI-2026-0417" (RN-PED-03)
  listingTitle: string
  listingDescription: string
  imageUrl: string | null
  priceInCents: number
  status: OrderStatus
  negotiation: Negotiation
  createdAt: string // ISO (UTC)
  seller: { name: string; whatsapp: string } // WhatsApp só com dígitos
}
