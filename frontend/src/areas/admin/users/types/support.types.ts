// Solicitação de suporte enviada por um aluno. Ainda não existe nos documentos (Regras, Banco,
// Backend): é formato assumido, com dados de exemplo, até o grupo decidir.
export type SupportRequestType = 'refund' | 'order_cancellation' | 'other'
export type SupportRequestStatus = 'open' | 'in_review' | 'resolved'

export type SupportRequest = {
  id: number
  type: SupportRequestType
  status: SupportRequestStatus
  userId: number
  userName: string
  userEmail: string
  orderId: number | null // pedido a que a solicitação se refere, quando houver
  message: string
  createdAt: string // ISO (UTC)
}
