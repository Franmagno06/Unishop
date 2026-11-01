// Interface do gateway de pagamento (backend.md §11, api.md §6). O resto do código só conhece
// esta interface; o Mercado Pago e o provider falso ficam atrás dela (ADR-002).

/** Status do gateway já traduzido: o resto do código nunca vê o status cru do Mercado Pago. */
export type GatewayStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'refunded'

export type GatewayPayment = {
  id: string
  status: GatewayStatus
  amountInCents: number
  /** Referência que o Unishop mandou na criação (`pedido:42`). */
  reference: string | null
  /** Pix: código "copia e cola". Só vem em cobrança Pix. */
  qrCode?: string | undefined
}

export type CardPaymentRequest = {
  /** Token gerado no navegador pelo SDK do gateway; nunca o número do cartão (RN-PAG-02). */
  token: string
  paymentMethodId: string
  issuerId?: string | undefined
  installments: number
  amountInCents: number
  reference: string
  description: string
  payerEmail: string
  idempotencyKey: string
}

export type PixPaymentRequest = {
  amountInCents: number
  expiresAt: Date
  reference: string
  description: string
  payerEmail: string
  idempotencyKey: string
}

export type WebhookInput = {
  headers: Record<string, string | string[] | undefined>
  query: Record<string, unknown>
}

/** Aviso com assinatura válida. `paymentId` só existe quando o aviso é de pagamento. */
export type VerifiedWebhook = { paymentId: string | null }

export interface PaymentGateway {
  readonly driver: 'mock' | 'mercadopago'
  createCardPayment(input: CardPaymentRequest): Promise<GatewayPayment>
  createPixPayment(input: PixPaymentRequest): Promise<GatewayPayment>
  /** Consulta o status real: o webhook nunca é confiado sozinho (RN-PAG-05). */
  getPayment(id: string): Promise<GatewayPayment>
  /** Lança `AppError` 401 se a assinatura, o `ts` (janela de 5 min) ou os cabeçalhos forem inválidos. */
  verifyWebhook(input: WebhookInput): VerifiedWebhook
  /** Cancela uma cobrança pendente (Pix vencido, pedido cancelado). */
  cancelPayment(id: string): Promise<void>
  /** Estorno total. A chave de idempotência impede estornar duas vezes. */
  refundPayment(id: string, idempotencyKey: string): Promise<void>
}
