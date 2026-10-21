import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import { authErrorContent, authErrorMessage, formatRetryAfter } from './error-messages'

const api = (status: number, code: string, retryAfter?: number) =>
  new ApiError(status, code, 'mensagem do servidor', [], retryAfter)

describe('formatRetryAfter', () => {
  it.each([
    [900, '15 minutos'],
    [60, '1 minuto'],
    [61, '2 minutos'],
    [1, '1 minuto'],
    [0, '1 minuto'],
  ])('%i s → %s', (seconds, expected) => {
    expect(formatRetryAfter(seconds)).toBe(expected)
  })
})

describe('authErrorContent', () => {
  it('credencial inválida: mensagem única, sem dizer qual campo errou (RN-ACE-08)', () => {
    expect(authErrorContent(api(401, 'INVALID_CREDENTIALS'))).toEqual({
      title: 'Não foi possível entrar',
      message: 'E-mail ou senha incorretos.',
    })
  })

  it('conta bloqueada: mostra o tempo restante (RN-ACE-09)', () => {
    expect(authErrorContent(api(429, 'ACCOUNT_LOCKED', 900))).toEqual({
      title: 'Conta bloqueada',
      message: 'Muitas tentativas erradas. Tente de novo em 15 minutos.',
    })
  })

  it('conta bloqueada sem tempo informado usa o texto padrão', () => {
    expect(authErrorContent(api(429, 'ACCOUNT_LOCKED')).message).toBe(
      'Conta bloqueada por 15 minutos por excesso de tentativas.',
    )
  })

  it('conta suspensa (RN-ACE-12)', () => {
    expect(authErrorContent(api(403, 'ACCOUNT_SUSPENDED'))).toEqual({
      title: 'Conta suspensa',
      message: 'Sua conta está suspensa. Fale com o suporte.',
    })
  })

  it('o título muda conforme a tela (entrar ou criar conta)', () => {
    expect(authErrorContent(api(500, 'INTERNAL_ERROR'), 'login').title).toBe('Servidor indisponível')
    expect(authErrorContent(api(409, 'EMAIL_ALREADY_REGISTERED'), 'register').title).toBe(
      'Não foi possível criar a conta',
    )
  })

  it('erro de rede e erro desconhecido têm mensagem própria', () => {
    expect(authErrorContent(new ApiError(0, 'NETWORK_ERROR', 'x')).title).toBe('Sem conexão')
    expect(authErrorContent(new Error('boom')).message).toBe('Algo deu errado. Tente de novo.')
  })

  it('erro 4xx desconhecido repassa a mensagem do servidor', () => {
    expect(authErrorMessage(api(400, 'OUTRO'))).toBe('mensagem do servidor')
  })
})
