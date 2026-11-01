import { afterEach, describe, expect, it, vi } from 'vitest'
import { tokenizeCard } from './mercadopago'

const card = { number: '4111 1111 1111 1111', holder: 'APRO', expiry: '11/30', cvv: '123' }

afterEach(() => vi.unstubAllEnvs())

describe('tokenizeCard', () => {
  it('sem chave pública, em desenvolvimento, devolve só um token falso (nunca o número do cartão)', async () => {
    vi.stubEnv('VITE_MP_PUBLIC_KEY', '')
    const result = await tokenizeCard(card)
    expect(result).toEqual({ token: 'mock_approved', paymentMethodId: 'visa', installments: 1 })
    expect(JSON.stringify(result)).not.toContain('4111')
  })

  it('o cartão de teste recusado vira o token mock_declined', async () => {
    vi.stubEnv('VITE_MP_PUBLIC_KEY', '')
    const result = await tokenizeCard({ ...card, number: '4000 0000 0000 0002' })
    expect(result.token).toBe('mock_declined')
  })

  it('com chave pública, troca o cartão por token no SDK e manda só o token', async () => {
    vi.stubEnv('VITE_MP_PUBLIC_KEY', 'TEST-chave-publica')
    const createCardToken = vi.fn().mockResolvedValue({ id: 'tok_123' })
    const getPaymentMethods = vi
      .fn()
      .mockResolvedValue({ results: [{ id: 'master', issuer: { id: 24 } }] })
    window.MercadoPago = vi.fn(function () {
      return { createCardToken, getPaymentMethods }
    }) as unknown as typeof window.MercadoPago

    const result = await tokenizeCard(card)

    expect(window.MercadoPago).toHaveBeenCalledWith('TEST-chave-publica', { locale: 'pt-BR' })
    expect(createCardToken).toHaveBeenCalledWith({
      cardNumber: '4111111111111111',
      cardholderName: 'APRO',
      cardExpirationMonth: '11',
      cardExpirationYear: '2030',
      securityCode: '123',
    })
    expect(getPaymentMethods).toHaveBeenCalledWith({ bin: '41111111' })
    expect(result).toEqual({
      token: 'tok_123',
      paymentMethodId: 'master',
      issuerId: '24',
      installments: 1,
    })
    expect(JSON.stringify(result)).not.toContain('4111')
    delete window.MercadoPago
  })
})
