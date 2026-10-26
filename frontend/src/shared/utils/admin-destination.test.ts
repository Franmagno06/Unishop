import { describe, expect, it } from 'vitest'
import { adminDestination } from './admin-destination'

describe('adminDestination', () => {
  it('volta à tela do painel em que a pessoa estava', () => {
    expect(adminDestination('/admin/produtos/3?pagina=2')).toBe('/admin/produtos/3?pagina=2')
  })

  it('sem destino, ou com destino fora do painel, vai para Usuários', () => {
    expect(adminDestination(undefined)).toBe('/admin/usuarios')
    expect(adminDestination('/produtos/7')).toBe('/admin/usuarios')
    expect(adminDestination('/admin/login')).toBe('/admin/usuarios')
  })

  it('nunca aceita endereço externo nem "//"', () => {
    expect(adminDestination('//evil.example/admin/x')).toBe('/admin/usuarios')
    expect(adminDestination('https://evil.example/admin/x')).toBe('/admin/usuarios')
    expect(adminDestination('/admin//evil.example')).toBe('/admin/usuarios')
  })
})
