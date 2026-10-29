import { OAuth2Client } from 'google-auth-library'
import { AppError } from '../../errors/app-error'
import type { OAuthProvider } from './oauth.provider'

// Sem GOOGLE_CLIENT_ID o botão falha e o login por e-mail e senha segue (api.md §10).
export function createGoogleProvider(clientId?: string): OAuthProvider {
  const client = clientId ? new OAuth2Client(clientId) : null

  return {
    async verifyIdToken(idToken) {
      if (!client || !clientId) {
        throw new AppError(
          503,
          'EXTERNAL_SERVICE_ERROR',
          'Login com Google indisponível. Use e-mail e senha.',
        )
      }
      let payload
      try {
        // A biblioteca confere assinatura, emissor, validade e a audiência (nosso Client ID).
        const ticket = await client.verifyIdToken({ idToken, audience: clientId })
        payload = ticket.getPayload()
      } catch {
        throw new AppError(401, 'TOKEN_INVALID', 'Não foi possível entrar com o Google.')
      }
      if (!payload?.sub || !payload.email) {
        throw new AppError(401, 'TOKEN_INVALID', 'Não foi possível entrar com o Google.')
      }
      return {
        googleSub: payload.sub,
        email: payload.email.toLowerCase(),
        emailVerified: payload.email_verified === true,
        name: payload.name ?? '',
      }
    },
  }
}
