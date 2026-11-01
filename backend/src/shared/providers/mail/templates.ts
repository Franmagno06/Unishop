import { escapeHtml } from '../../utils/html'
import { formatBRL } from '../../utils/money'
import type {
  ListingRemovedMail,
  OrderRefundedMail,
  PasswordResetMail,
  SaleConfirmedMail,
} from './mail.provider'

// Modelos de e-mail em português: funções puras que devolvem { subject, html, text } (RN-NOT-01 a 03,
// RN-ACE-10). Todo valor interpolado no HTML passa por `escapeHtml`; o assunto nunca leva \r nem \n
// (injeção de cabeçalho). Os drivers só entregam o resultado; o console não imprime o HTML.
export type RenderedMail = { subject: string; html: string; text: string }

const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim()
const e = escapeHtml

const layout = (title: string, paragraphs: string[]) =>
  `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">` +
  `<h2>${e(title)}</h2>${paragraphs.map((p) => `<p>${p}</p>`).join('')}` +
  `<p style="color:#666;font-size:12px">Unishop</p></div>`

// RN-ACE-10: link de uso único; o href leva o link escapado (& vira &amp;).
export function passwordReset(mail: PasswordResetMail): RenderedMail {
  const subject = 'Redefinição de senha do Unishop'
  return {
    subject,
    html: layout(subject, [
      `Olá, ${e(mail.name)}.`,
      `Para criar uma nova senha, use o link abaixo. Ele vale por ${mail.expiresInMinutes} minutos e só pode ser usado uma vez.`,
      `<a href="${e(mail.link)}">Redefinir minha senha</a>`,
      'Se não foi você, ignore este e-mail.',
    ]),
    text:
      `Olá, ${mail.name}.\n\nPara criar uma nova senha, acesse o link (vale por ` +
      `${mail.expiresInMinutes} minutos, uso único):\n${mail.link}\n\nSe não foi você, ignore este e-mail.`,
  }
}

// RN-NOT-02
export function listingRemoved(mail: ListingRemovedMail): RenderedMail {
  const subject = oneLine(`Seu anúncio "${mail.listingTitle}" foi removido`)
  return {
    subject,
    html: layout('Anúncio removido', [
      `Olá, ${e(mail.name)}.`,
      `A administração removeu o seu anúncio "${e(mail.listingTitle)}" do Unishop.`,
    ]),
    text: `Olá, ${mail.name}.\n\nA administração removeu o seu anúncio "${mail.listingTitle}" do Unishop.`,
  }
}

// RN-NOT-01
export function saleConfirmed(mail: SaleConfirmedMail): RenderedMail {
  const total = formatBRL(mail.totalInCents)
  const subject = oneLine(`Venda confirmada: pedido ${mail.orderNumber}`)
  return {
    subject,
    html: layout('Venda confirmada', [
      `Olá, ${e(mail.name)}.`,
      `O pagamento do pedido ${e(mail.orderNumber)} foi aprovado: ${mail.quantity} x ${e(mail.productName)}, total de ${e(total)}.`,
      'Combine a retirada com o comprador pelo WhatsApp.',
    ]),
    text:
      `Olá, ${mail.name}.\n\nO pagamento do pedido ${mail.orderNumber} foi aprovado: ` +
      `${mail.quantity} x ${mail.productName}, total de ${total}.\nCombine a retirada com o comprador pelo WhatsApp.`,
  }
}

const REFUND_REASONS: Record<OrderRefundedMail['reason'], string> = {
  out_of_stock: 'o estoque acabou antes da confirmação do pagamento',
  listing_unavailable: 'o anúncio deixou de estar disponível',
  late_payment: 'o pagamento chegou depois do cancelamento do pedido',
}

// RN-NOT-03
export function orderRefunded(mail: OrderRefundedMail): RenderedMail {
  const reason = REFUND_REASONS[mail.reason]
  const subject = oneLine(`Pedido ${mail.orderNumber} cancelado e estornado`)
  return {
    subject,
    html: layout('Pedido cancelado e estornado', [
      `Olá, ${e(mail.name)}.`,
      `O pedido ${e(mail.orderNumber)} (${e(mail.productName)}) foi cancelado porque ${e(reason)}. O valor será estornado.`,
    ]),
    text:
      `Olá, ${mail.name}.\n\nO pedido ${mail.orderNumber} (${mail.productName}) foi cancelado porque ` +
      `${reason}. O valor será estornado.`,
  }
}
