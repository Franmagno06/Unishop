import { describe, expect, it } from 'vitest'
import { cardSchema } from '../schemas/card.schema'
import { formatCardNumber, formatCountdown, formatExpiry, isExpiryInFuture, isLuhnValid } from './card'

describe('formatCardNumber', () => {
  it('agrupa de 4 em 4 e ignora o que não é dígito', () => {
    expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111')
    expect(formatCardNumber('4111-1111 abc 1111')).toBe('4111 1111 1111')
  })
  it('limita a 19 dígitos', () => {
    expect(formatCardNumber('1'.repeat(30)).replace(/\s/g, '')).toHaveLength(19)
  })
})

describe('formatExpiry', () => {
  it('só põe a barra depois do 3º dígito (dá para apagar com Backspace)', () => {
    expect(formatExpiry('1')).toBe('1')
    expect(formatExpiry('12')).toBe('12')
    expect(formatExpiry('122')).toBe('12/2')
    expect(formatExpiry('1228')).toBe('12/28')
    expect(formatExpiry('12/28999')).toBe('12/28')
  })
})

describe('isLuhnValid', () => {
  it('aceita os cartões de teste e recusa erro de digitação', () => {
    expect(isLuhnValid('4111 1111 1111 1111')).toBe(true)
    expect(isLuhnValid('4000000000000002')).toBe(true)
    expect(isLuhnValid('4111 1111 1111 1112')).toBe(false)
    expect(isLuhnValid('')).toBe(false)
  })
})

describe('isExpiryInFuture', () => {
  const now = new Date(2026, 9, 22) // outubro de 2026
  it('vale até o fim do mês de validade', () => {
    expect(isExpiryInFuture('10/26', now)).toBe(true)
    expect(isExpiryInFuture('09/26', now)).toBe(false)
    expect(isExpiryInFuture('01/27', now)).toBe(true)
    expect(isExpiryInFuture('12/25', now)).toBe(false)
  })
  it('recusa formato inválido e mês fora de 01 a 12', () => {
    expect(isExpiryInFuture('1/27', now)).toBe(false)
    expect(isExpiryInFuture('13/27', now)).toBe(false)
    expect(isExpiryInFuture('00/27', now)).toBe(false)
  })
})

describe('formatCountdown', () => {
  it('mostra mm:ss e nunca fica negativo', () => {
    expect(formatCountdown(1800)).toBe('30:00')
    expect(formatCountdown(61)).toBe('01:01')
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(-5)).toBe('00:00')
  })
})

describe('cardSchema (RN-PAG-03)', () => {
  const valid = { number: '4111 1111 1111 1111', holder: 'Francisco Magno', expiry: '12/99', cvv: '123' }

  it('aceita um cartão completo', () => {
    expect(cardSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['number', '', 'Informe o número do cartão.'],
    ['number', '4111 1111', 'O número do cartão tem de 13 a 19 dígitos.'],
    ['number', '4111 1111 1111 1112', 'Confira o número do cartão: ele parece inválido.'],
    ['holder', '', 'Informe o nome impresso no cartão.'],
    ['holder', 'Al', 'O nome deve ter pelo menos 3 caracteres.'],
    ['holder', 'A'.repeat(61), 'O nome pode ter no máximo 60 caracteres.'],
    ['expiry', '', 'Informe a validade.'],
    ['expiry', '1/27', 'Use o formato MM/AA.'],
    ['expiry', '01/20', 'Este cartão está vencido.'],
    ['cvv', '', 'Informe o CVV.'],
    ['cvv', '12', 'O CVV tem 3 ou 4 dígitos.'],
    ['cvv', '12a', 'O CVV tem 3 ou 4 dígitos.'],
  ])('recusa %s = "%s"', (field, value, message) => {
    const result = cardSchema.safeParse({ ...valid, [field]: value })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toContain(message)
  })

  it('aceita CVV de 4 dígitos', () => {
    expect(cardSchema.safeParse({ ...valid, cvv: '1234' }).success).toBe(true)
  })
})
