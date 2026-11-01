import type { MailProvider } from './mail.provider'

// Endereço que a anonimização grava (`removido_<id>@removido.invalid`, account-anonymization.ts):
// nunca é entregável. Um Pix pago depois da exclusão da conta gera estorno, e o e-mail de estorno
// iria para ele (RN-NOT-03, RN-PER-06).
const UNDELIVERABLE_SUFFIX = '@removido.invalid'

export function isDeliverable(to: string): boolean {
  return !to.trim().toLowerCase().endsWith(UNDELIVERABLE_SUFFIX)
}

/** Envolve qualquer driver: e-mail para endereço anonimizado é descartado em silêncio. */
export function withDeliveryGuard(inner: MailProvider): MailProvider {
  const guarded =
    <T extends { to: string }>(send: (mail: T) => Promise<void>) =>
    async (mail: T): Promise<void> => {
      if (isDeliverable(mail.to)) await send(mail)
    }
  return {
    sendPasswordReset: guarded((m) => inner.sendPasswordReset(m)),
    sendListingRemoved: guarded((m) => inner.sendListingRemoved(m)),
    sendSaleConfirmed: guarded((m) => inner.sendSaleConfirmed(m)),
    sendOrderRefunded: guarded((m) => inner.sendOrderRefunded(m)),
  }
}
