import { inspect } from 'node:util'
import { describe, expect, it } from 'vitest'
import { redact, Secret } from '../../src/shared/security'

describe('Secret', () => {
  it('não vaza em string, JSON nem inspect, mas revela no ponto de uso', () => {
    const s = new Secret('abc123')
    expect(`${s}`).toBe('[REDACTED]')
    expect(JSON.stringify({ s })).toBe('{"s":"[REDACTED]"}')
    expect(inspect(s)).toBe('[REDACTED]')
    expect(s.reveal()).toBe('abc123')
  })
})

describe('redact', () => {
  it('mascara chaves sensíveis em qualquer nível', () => {
    const out = redact({
      email: 'a@edu.unifor.br',
      password: 'x',
      nested: { Authorization: 'Bearer y', cardToken: 'z', ok: 1 },
      list: [{ whatsapp: '85999999999' }],
    })
    expect(out).toEqual({
      email: 'a@edu.unifor.br',
      password: '[REDACTED]',
      nested: { Authorization: '[REDACTED]', cardToken: '[REDACTED]', ok: 1 },
      list: [{ whatsapp: '[REDACTED]' }],
    })
  })
})
