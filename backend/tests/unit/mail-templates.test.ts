import { describe, expect, it } from 'vitest'
import { escapeHtml } from '../../src/shared/utils/html'
import { formatBRL } from '../../src/shared/utils/money'
import { isDeliverable, withDeliveryGuard } from '../../src/shared/providers/mail/guard'
import {
  emailChange,
  listingRemoved,
  orderRefunded,
  passwordReset,
  saleConfirmed,
} from '../../src/shared/providers/mail/templates'
import { createFakeMail } from '../helpers/fakes'

// RN-NOT-01 a 03, RN-ACE-10: modelos de e-mail puros (HTML escapado) e guarda de destinatário.
const XSS = '<script>alert(1)</script>'

describe('escapeHtml', () => {
  it('escapa & < > " e aspas simples', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})

describe('modelos de e-mail', () => {
  it('escapa o nome e o título do produto no HTML (listingRemoved)', () => {
    const m = listingRemoved({ to: 'a@edu.unifor.br', name: XSS, listingTitle: XSS })
    expect(m.html).not.toContain('<script>')
    expect(m.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('escapa nome, produto e número do pedido (saleConfirmed e orderRefunded)', () => {
    const sale = saleConfirmed({
      to: 'a@edu.unifor.br',
      name: XSS,
      productName: XSS,
      quantity: 2,
      totalInCents: 1234,
      orderNumber: XSS,
    })
    const refund = orderRefunded({
      to: 'a@edu.unifor.br',
      name: XSS,
      productName: XSS,
      orderNumber: XSS,
      reason: 'out_of_stock',
    })
    for (const m of [sale, refund]) {
      expect(m.html).not.toContain('<script>')
      expect(m.html).toContain('&lt;script&gt;')
    }
  })

  it('o texto puro não tem tags HTML', () => {
    const m = saleConfirmed({
      to: 'a@edu.unifor.br',
      name: 'Ana',
      productName: 'Livro',
      quantity: 1,
      totalInCents: 5000,
      orderNumber: 'UNI-2026-0001',
    })
    expect(m.text).not.toMatch(/<[^>]+>/)
    expect(m.text).toContain('Livro')
  })

  it('o assunto sai em uma linha (sem \\r nem \\n)', () => {
    const m = listingRemoved({
      to: 'a@edu.unifor.br',
      name: 'Ana',
      listingTitle: 'Livro\r\nBcc: x@y.z',
    })
    expect(m.subject).not.toMatch(/[\r\n]/)
  })

  it('formata centavos como R$ 12,34', () => {
    expect(formatBRL(1234)).toBe('R$ 12,34')
    expect(formatBRL(5)).toBe('R$ 0,05')
    const m = saleConfirmed({
      to: 'a@edu.unifor.br',
      name: 'Ana',
      productName: 'Livro',
      quantity: 1,
      totalInCents: 1234,
      orderNumber: 'UNI-2026-0001',
    })
    expect(m.html).toContain('R$ 12,34')
    expect(m.text).toContain('R$ 12,34')
  })

  it('o link de redefinição aparece intacto, com o href escapado', () => {
    const link = 'http://localhost:5173/redefinir-senha/abc_DEF-123?a=1&b=2'
    const m = passwordReset({ to: 'a@edu.unifor.br', name: 'Ana', link, expiresInMinutes: 30 })
    expect(m.html).toContain('href="http://localhost:5173/redefinir-senha/abc_DEF-123?a=1&amp;b=2"')
    expect(m.text).toContain(link)
    expect(m.html).toContain('30 minutos')
  })
})

describe('emailChange', () => {
  it('leva o link intacto e escapa o nome', () => {
    const link = 'http://localhost:5173/confirmar-troca-email/abc123'
    const m = emailChange({ to: 'n@edu.unifor.br', name: XSS, link, expiresInMinutes: 30 })
    expect(m.html).toContain(`href="${link}"`)
    expect(m.html).not.toContain('<script>')
    expect(m.text).toContain(link)
    expect(m.subject).not.toMatch(/[\r\n]/)
  })
})

describe('guarda de destinatário', () => {
  it('endereço anonimizado não é entregável; institucional é', () => {
    expect(isDeliverable('removido_7@removido.invalid')).toBe(false)
    expect(isDeliverable('REMOVIDO_7@Removido.Invalid')).toBe(false)
    expect(isDeliverable('a@edu.unifor.br')).toBe(true)
  })

  it('o wrapper descarta o envio ao endereço anonimizado e repassa os demais', async () => {
    const fake = createFakeMail()
    const guarded = withDeliveryGuard(fake.provider)
    await guarded.sendOrderRefunded({
      to: 'removido_7@removido.invalid',
      name: 'Usuário removido',
      productName: 'Livro',
      orderNumber: 'UNI-2026-0001',
      reason: 'late_payment',
    })
    await guarded.sendOrderRefunded({
      to: 'a@edu.unifor.br',
      name: 'Ana',
      productName: 'Livro',
      orderNumber: 'UNI-2026-0002',
      reason: 'late_payment',
    })
    expect(fake.refunds.map((r) => r.to)).toEqual(['a@edu.unifor.br'])
  })
})
