import { describe, expect, it } from 'vitest'
import { formatLastAccess, formatLastSeen } from './last-access'

const NOW = Date.parse('2026-10-25T18:00:00Z') // 15:00 em Fortaleza

describe('formatLastSeen (RN-ADM-03)', () => {
  it('mostra minutos, horas e dias desde o último acesso', () => {
    expect(formatLastSeen('2026-10-25T17:54:00Z', NOW)).toBe('Visto há 6 min')
    expect(formatLastSeen('2026-10-25T16:00:00Z', NOW)).toBe('Visto há 2 h')
    expect(formatLastSeen('2026-10-24T17:00:00Z', NOW)).toBe('Visto há 1 dia')
    expect(formatLastSeen('2026-10-20T18:00:00Z', NOW)).toBe('Visto há 5 dias')
  })

  it('depois de 30 dias mostra a data', () => {
    expect(formatLastSeen('2026-08-03T18:00:00Z', NOW)).toBe('Visto em 03/08/2026')
  })
})

describe('formatLastAccess', () => {
  it('usa "Hoje" e "Ontem" no fuso de Fortaleza', () => {
    expect(formatLastAccess('2026-10-25T17:02:00Z', NOW)).toBe('Hoje, 14:02')
    expect(formatLastAccess('2026-10-24T12:30:00Z', NOW)).toBe('Ontem, 09:30')
    expect(formatLastAccess('2026-08-03T12:30:00Z', NOW)).toBe('03/08/2026, 09:30')
  })
})
