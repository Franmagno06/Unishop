/** `ultimo_erro` da tentativa que falhou no gateway sem receber id (timeout): marca a candidata à conciliação. */
export const GATEWAY_ERROR = 'GATEWAY_ERROR'

export type PaymentStatus =
  'pendente' | 'aprovado' | 'recusado' | 'expirado' | 'estorno_pendente' | 'estornado'

export type PaymentRow = {
  id: number
  orderId: number
  gatewayTxId: string | null
  method: 'pix' | 'card'
  status: PaymentStatus
  amountInCents: number
  refundAttempts: number
  lastError: string | null
  createdAt: Date
}

/** O que a cobrança precisa saber do pedido e do comprador. */
export type ChargeContext = {
  orderId: number
  buyerId: number
  buyerEmail: string
  buyerName: string
  productName: string
}

export type RefundReason =
  'out_of_stock' | 'listing_unavailable' | 'late_payment' | 'amount_mismatch'

/** Resultado da liquidação (backend.md §11). `noop` = já liquidado antes (idempotência, RN-PAG-06). */
export type SettleOutcome =
  { kind: 'noop' } | { kind: 'paid' } | { kind: 'refund'; reason: RefundReason }

export type AttemptResult =
  { kind: 'created'; payment: PaymentRow; idempotencyKey: string } | { kind: 'in_progress' }

export type SaleMailContext = {
  sellerEmail: string
  sellerName: string
  productName: string
  quantity: number
  totalInCents: number
  orderId: number
  createdAt: Date
}

export type RefundMailContext = {
  buyerEmail: string
  buyerName: string
  productName: string
  orderId: number
  createdAt: Date
  reason: RefundReason
}

export interface PaymentRepository {
  chargeContext(orderId: number): Promise<ChargeContext | null>
  /** Cobrança Pix pendente do pedido (para devolver o mesmo código, sem criar outra). */
  findPendingByMethod(orderId: number, method: 'pix' | 'card'): Promise<PaymentRow | null>
  /** Nova tentativa (uma linha por tentativa; só uma pendente por pedido: `uq_pagamento_ativo`). */
  createAttempt(args: {
    orderId: number
    method: 'pix' | 'card'
    amountInCents: number
    expiresAt: Date | null
  }): Promise<AttemptResult>
  attachGateway(paymentId: number, gatewayTxId: string): Promise<void>
  /** Troca o estado só se ainda estiver em um dos de origem. */
  setStatus(
    paymentId: number,
    from: PaymentStatus[],
    to: PaymentStatus,
    lastError?: string,
  ): Promise<boolean>
  findByGatewayId(gatewayTxId: string): Promise<PaymentRow | null>
  findById(paymentId: number): Promise<PaymentRow | null>
  /** Liquidação única: pedido Pago, ou Cancelado + `estorno_pendente`. Transação com trava. */
  settle(paymentId: number): Promise<SettleOutcome>
  /** `estorno_pendente` ainda abaixo do limite de tentativas (job de estorno). */
  findPendingRefunds(maxAttempts: number, limit: number): Promise<PaymentRow[]>
  markRefunded(paymentId: number): Promise<void>
  recordRefundFailure(paymentId: number, message: string): Promise<void>
  /**
   * Pagamentos com cobrança no gateway para reconsultar (job de conciliação): pendente criados antes
   * do corte e expirado criados desde expiredSince (Pix pago com webhook perdido, RN-PAG-13).
   */
  findStalePending(createdBefore: Date, expiredSince: Date, limit: number): Promise<PaymentRow[]>
  /** Tentativa mais recente do pedido que falhou no gateway sem receber id (timeout), se houver. */
  findOrphanAttempt(orderId: number): Promise<PaymentRow | null>
  /** Anexa o id do gateway a uma tentativa órfã e a reabre como expirado. false se outra a pegou antes. */
  claimOrphan(paymentId: number, gatewayTxId: string): Promise<boolean>
  saleMailContext(paymentId: number): Promise<SaleMailContext | null>
  refundMailContext(paymentId: number): Promise<RefundMailContext | null>
}
