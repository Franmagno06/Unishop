import { ApiError } from '../../../../shared/lib/api'

// Mensagens de tela por código de erro (frontend.md §12). RN-ACE-08: nunca diz qual campo errou.
export function authErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Algo deu errado. Tente de novo.'

  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'E-mail ou senha incorretos.'
    case 'ACCOUNT_LOCKED':
      return 'Conta bloqueada por 15 minutos por excesso de tentativas.'
    case 'ACCOUNT_SUSPENDED':
      return 'Sua conta está suspensa. Fale com o suporte.'
    case 'EMAIL_NOT_VERIFIED':
      return 'Confirme seu e-mail antes de entrar.'
    case 'EMAIL_DOMAIN_NOT_ALLOWED':
      return 'Use seu e-mail @edu.unifor.br.'
    case 'EMAIL_ALREADY_REGISTERED':
      return 'Este e-mail já tem cadastro. Tente entrar.'
    case 'TOO_MANY_REQUESTS':
      return 'Muitas tentativas. Tente de novo em instantes.'
    case 'NETWORK_ERROR':
      return 'Não foi possível falar com o servidor. Confira sua conexão e tente de novo.'
    default:
      return error.status >= 500
        ? 'O servidor não conseguiu responder. Tente de novo em instantes.'
        : error.message
  }
}
