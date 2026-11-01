import type { CardPaymentInput } from '../../orders/types/order.types'

// Tokenização do cartão com o SDK do Mercado Pago (RN-PAG-02, RNF006). O navegador troca os dados
// do cartão por um token e SÓ o token vai ao backend: número, validade e CVV nunca chegam ao
// Unishop. Usa a chave PÚBLICA (VITE_MP_PUBLIC_KEY); a chave privada fica só no backend.

export type CardToken = {
  token: string
  paymentMethodId: string
  issuerId?: string
  installments: number
}

type MercadoPagoSdk = {
  getPaymentMethods(args: { bin: string }): Promise<{
    results: { id: string; issuer?: { id?: string | number } }[]
  }>
  createCardToken(args: {
    cardNumber: string
    cardholderName: string
    cardExpirationMonth: string
    cardExpirationYear: string
    securityCode: string
  }): Promise<{ id: string }>
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale: string }) => MercadoPagoSdk
  }
}

const SDK_URL = 'https://sdk.mercadopago.com/js/v2'
let sdkPromise: Promise<void> | null = null

// Carrega o script oficial uma única vez, só quando alguém vai pagar com cartão.
function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve()
  sdkPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      sdkPromise = null
      reject(new Error('Não foi possível carregar o serviço de pagamento. Tente de novo.'))
    }
    document.head.appendChild(script)
  })
  return sdkPromise
}

export async function tokenizeCard(card: CardPaymentInput): Promise<CardToken> {
  const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined
  const digits = card.number.replace(/\D/g, '')

  if (!publicKey) {
    // Sem chave pública: só em desenvolvimento, com o gateway falso do backend (PAYMENT_DRIVER=mock).
    // O token falso diz ao mock o que fazer; o número do cartão nunca é enviado.
    if (import.meta.env.DEV) {
      const declined = digits === '4000000000000002'
      return {
        token: declined ? 'mock_declined' : 'mock_approved',
        paymentMethodId: 'visa',
        installments: 1,
      }
    }
    throw new Error('O pagamento com cartão não está disponível no momento.')
  }

  await loadSdk()
  const mp = new window.MercadoPago!(publicKey, { locale: 'pt-BR' })
  const [month = '', year = ''] = card.expiry.split('/')
  const [methods, token] = await Promise.all([
    mp.getPaymentMethods({ bin: digits.slice(0, 8) }),
    mp.createCardToken({
      cardNumber: digits,
      cardholderName: card.holder,
      cardExpirationMonth: month,
      cardExpirationYear: `20${year}`,
      securityCode: card.cvv,
    }),
  ])
  const method = methods.results[0]
  if (!method || !token.id) throw new Error('Não foi possível validar o cartão. Confira os dados.')
  const issuerId = method.issuer?.id
  return {
    token: token.id,
    paymentMethodId: method.id,
    ...(issuerId !== undefined && { issuerId: String(issuerId) }),
    installments: 1,
  }
}
