export type PasswordResetMail = { to: string; name: string; link: string; expiresInMinutes: number }

// RN-NOT-02: aviso ao vendedor quando o admin exclui o produto.
export type ListingRemovedMail = { to: string; name: string; listingTitle: string }

// Venda confirmada: aviso ao vendedor quando o pagamento é aprovado (RN-NOT-01).
export type SaleConfirmedMail = {
  to: string
  name: string
  productName: string
  quantity: number
  totalInCents: number
  orderNumber: string
}

// Pedido pago cancelado com estorno ao comprador (RN-NOT-03).
export type OrderRefundedMail = {
  to: string
  name: string
  productName: string
  orderNumber: string
  reason: 'out_of_stock' | 'listing_unavailable' | 'late_payment'
}

// RN-PER-02: link de confirmação enviado ao NOVO endereço.
export type EmailChangeMail = { to: string; name: string; link: string; expiresInMinutes: number }

// Interface do e-mail (api.md §6). Resend/Mailtrap entram na Etapa 10.
export interface MailProvider {
  sendPasswordReset(mail: PasswordResetMail): Promise<void>
  sendListingRemoved(mail: ListingRemovedMail): Promise<void>
  sendSaleConfirmed(mail: SaleConfirmedMail): Promise<void>
  sendOrderRefunded(mail: OrderRefundedMail): Promise<void>
  sendEmailChange(mail: EmailChangeMail): Promise<void>
}
