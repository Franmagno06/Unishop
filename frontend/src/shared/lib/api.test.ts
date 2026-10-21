import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './api'
import { clearToken, getToken, setToken } from './session'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('api', () => {
  const originalLocation = window.location

  beforeEach(() => {
    clearToken()
    // jsdom não deixa trocar de página: troca o location por um que só registra a chamada
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: vi.fn() },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearToken()
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('devolve o JSON de uma resposta 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(200, { data: { ok: true } })))
    await expect(api('/x')).resolves.toEqual({ data: { ok: true } })
  })

  it('aceita 202 sem corpo (envio do link de redefinição de senha)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 202 })))
    await expect(api('/auth/forgot-password', { method: 'POST', body: { email: 'a@b.c' } })).resolves.toBeUndefined()
  })

  it('aceita 200 com corpo vazio e 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('', { status: 200 })).mockResolvedValueOnce(new Response(null, { status: 204 })))
    await expect(api('/a')).resolves.toBeUndefined()
    await expect(api('/b')).resolves.toBeUndefined()
  })

  it('envia o corpo como JSON, com o método informado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await api('/auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'x' } })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/auth\/login$/)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.c', password: 'x' })
  })

  it('manda o token no cabeçalho Authorization quando há sessão', async () => {
    setToken('jwt-123')
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await api('/auth/me')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({ Authorization: 'Bearer jwt-123' })
  })

  it('sem sessão, não manda Authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await api('/auth/login', { method: 'POST', body: {} })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).not.toHaveProperty('Authorization')
  })

  it('transforma o erro do backend em ApiError (código, mensagem, campos e retryAfter)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json(429, {
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Conta bloqueada',
            details: [{ field: 'email', message: 'x' }],
            retryAfter: 900,
          },
        }),
      ),
    )

    const error = await api('/auth/login').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 429,
      code: 'ACCOUNT_LOCKED',
      message: 'Conta bloqueada',
      fieldErrors: [{ field: 'email', message: 'x' }],
      retryAfter: 900,
    })
  })

  it('erro sem corpo do Unishop vira INTERNAL_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 502 })))
    const error = await api('/x').catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 502, code: 'INTERNAL_ERROR' })
  })

  it('413 da Vercel (sem corpo do Unishop) vira FILE_TOO_LARGE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Payload Too Large', { status: 413 })))
    const error = await api('/listings/1/images', { method: 'POST' }).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 413, code: 'FILE_TOO_LARGE' })
  })

  it('falha de rede vira NETWORK_ERROR (status 0)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = await api('/x').catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('401 com sessão aberta apaga o token e leva ao login (RN-ACE-11)', async () => {
    setToken('jwt-vencido')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, { error: { code: 'UNAUTHORIZED', message: 'x' } })))

    await expect(api('/auth/me')).rejects.toBeInstanceOf(ApiError)

    expect(getToken()).toBeNull()
    expect(window.location.assign).toHaveBeenCalledWith('/login')
  })

  it('401 sem sessão (login errado) NÃO redireciona', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'x' } })))

    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiError)

    expect(window.location.assign).not.toHaveBeenCalled()
  })
})
