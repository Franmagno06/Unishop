import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearToken, getRole, getToken, hasToken, setToken, subscribe } from './session'

afterEach(() => {
  clearToken()
  vi.restoreAllMocks()
})

describe('session', () => {
  it('começa sem sessão', () => {
    expect(getToken()).toBeNull()
    expect(getRole()).toBeNull()
    expect(hasToken()).toBe(false)
  })

  it('setToken guarda o token e o papel (aluno por padrão)', () => {
    setToken('jwt-1')
    expect([getToken(), getRole(), hasToken()]).toEqual(['jwt-1', 'student', true])

    setToken('jwt-2', 'admin')
    expect([getToken(), getRole()]).toEqual(['jwt-2', 'admin'])
  })

  it('clearToken apaga o token e o papel, na memória e no sessionStorage', () => {
    setToken('jwt-1', 'admin')
    expect(sessionStorage.getItem('unishop.token')).toBe('jwt-1')
    expect(sessionStorage.getItem('unishop.role')).toBe('admin')

    clearToken()

    expect([getToken(), getRole(), hasToken()]).toEqual([null, null, false])
    expect(sessionStorage.getItem('unishop.token')).toBeNull()
    expect(sessionStorage.getItem('unishop.role')).toBeNull()
  })

  it('avisa quem está inscrito quando a sessão muda', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    setToken('jwt-1')
    clearToken()
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    setToken('jwt-2')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('vários inscritos recebem o aviso, e cancelar um não atrapalha os outros', () => {
    const a = vi.fn()
    const b = vi.fn()
    const unsubscribeA = subscribe(a)
    subscribe(b)

    unsubscribeA()
    setToken('jwt-1')

    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('a sessão sobrevive ao F5: lê o token e o papel do sessionStorage ao carregar', async () => {
    sessionStorage.setItem('unishop.token', 'jwt-salvo')
    sessionStorage.setItem('unishop.role', 'admin')
    vi.resetModules()

    const fresh = await import('./session')

    expect([fresh.getToken(), fresh.getRole()]).toEqual(['jwt-salvo', 'admin'])
  })

  it('token guardado sem papel (ou com papel inválido) vira aluno', async () => {
    sessionStorage.setItem('unishop.token', 'jwt-antigo')
    sessionStorage.setItem('unishop.role', 'hacker')
    vi.resetModules()

    const fresh = await import('./session')

    expect(fresh.getRole()).toBe('student')
  })

  it('papel guardado sem token é ignorado', async () => {
    sessionStorage.removeItem('unishop.token')
    sessionStorage.setItem('unishop.role', 'admin')
    vi.resetModules()

    const fresh = await import('./session')

    expect([fresh.getToken(), fresh.getRole()]).toEqual([null, null])
  })

  it('com o sessionStorage bloqueado, a sessão fica só em memória e nada quebra', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })

    expect(() => setToken('jwt-1')).not.toThrow()
    expect(getToken()).toBe('jwt-1')
    expect(() => clearToken()).not.toThrow()
    expect(getToken()).toBeNull()
  })
})
