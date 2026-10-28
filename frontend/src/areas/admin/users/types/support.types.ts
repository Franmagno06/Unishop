// Solicitação de suporte enviada por um aluno. Ainda não existe nos documentos (Regras, Banco,
// Backend): é formato assumido, com dados de exemplo, até o grupo decidir.
export type SupportRequestType = 'refund' | 'order_cancellation' | 'other'
export type SupportRequestStatus = 'open' | 'in_review' | 'resolved' | 'denied'

export type SupportRequest = {
  id: number
  type: SupportRequestType
  status: SupportRequestStatus
  userId: number
  userName: string
  userEmail: string
  orderId: number | null // pedido a que a solicitação se refere, quando houver
  // Motivo marcado pelo aluno no cancelamento (ex.: "Atraso na entrega"); "Outros" traz o texto em `message`.
  reason?: string
  message: string
  photos: string[] // fotos anexadas ao pedido de reembolso (URLs)
  createdAt: string // ISO (UTC)
}
