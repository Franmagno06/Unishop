import { describe, expect, it } from 'vitest'
import { startOfSalesMonth } from '../../src/admin/listings/admin-listings.rules'

describe('startOfSalesMonth', () => {
  // Decisão 5: mês do calendário em Fortaleza (UTC-3, sem horário de verão); 00h local = 03h UTC.
  it('RN-ADM-07: o mês começa no dia 1 às 00h de Fortaleza (03h UTC)', () => {
    expect(startOfSalesMonth(new Date('2026-10-31T15:00:00Z')).toISOString()).toBe(
      '2026-10-01T03:00:00.000Z',
    )
  })

  it('RN-ADM-07: venda às 23h59 do último dia do mês anterior (horário de Fortaleza) não conta', () => {
    const start = startOfSalesMonth(new Date('2026-10-15T12:00:00Z'))
    const lastSecond = new Date('2026-10-01T02:59:59.999Z') // 23h59 de 30/09 em Fortaleza
    expect(lastSecond.getTime() >= start.getTime()).toBe(false)
  })

  it('RN-ADM-07: venda à 00h00 do dia 1 conta', () => {
    const start = startOfSalesMonth(new Date('2026-10-15T12:00:00Z'))
    expect(new Date('2026-10-01T03:00:00.000Z').getTime() >= start.getTime()).toBe(true)
  })

  it('RN-ADM-07: logo depois da meia-noite UTC do dia 1 ainda é o mês anterior em Fortaleza', () => {
    // 01/11 01:00 UTC = 31/10 22:00 em Fortaleza
    expect(startOfSalesMonth(new Date('2026-11-01T01:00:00Z')).toISOString()).toBe(
      '2026-10-01T03:00:00.000Z',
    )
  })

  it('RN-ADM-07: virada de ano', () => {
    expect(startOfSalesMonth(new Date('2027-01-01T02:00:00Z')).toISOString()).toBe(
      '2026-12-01T03:00:00.000Z',
    )
  })
})
