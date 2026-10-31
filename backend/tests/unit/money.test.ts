import { describe, expect, it } from 'vitest'
import { centsToDecimal, decimalToCents } from '../../src/shared/utils/money'

describe('money (dinheiro em centavos, CLAUDE.md)', () => {
  it('RN-ANU-02: converte numeric(10,2) em centavos sem ponto flutuante', () => {
    expect(decimalToCents('0.01')).toBe(1)
    expect(decimalToCents('19.9')).toBe(1990)
    expect(decimalToCents('99999.99')).toBe(9_999_999)
    expect(decimalToCents({ toString: () => '1234.50' })).toBe(123_450)
    expect(decimalToCents(0.1 + 0.2)).toBe(30) // 0.30000000000000004
  })

  it('RN-ANU-02: converte centavos em texto com duas casas para gravar no banco', () => {
    expect(centsToDecimal(1)).toBe('0.01')
    expect(centsToDecimal(1990)).toBe('19.90')
    expect(centsToDecimal(9_999_999)).toBe('99999.99')
    expect(centsToDecimal(0)).toBe('0.00')
  })

  it('recusa centavos que não sejam inteiros', () => {
    expect(() => centsToDecimal(10.5)).toThrow()
    expect(() => centsToDecimal(-1)).toThrow()
  })
})
