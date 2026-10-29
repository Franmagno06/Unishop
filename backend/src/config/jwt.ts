import jwt from 'jsonwebtoken'
import { AppError } from '../shared/errors/app-error'
import type { UserRole } from '../shared/types/express'

export type TokenPayload = { sub: string; role: UserRole; iat: number }

export function createJwt(secret: string, expiresIn: string) {
  return {
    sign(user: { id: number; role: UserRole }) {
      return jwt.sign({ role: user.role }, secret, {
        algorithm: 'HS256',
        subject: String(user.id),
        expiresIn: expiresIn as NonNullable<jwt.SignOptions['expiresIn']>,
      })
    },
    verify(token: string): TokenPayload {
      try {
        return jwt.verify(token, secret, { algorithms: ['HS256'] }) as unknown as TokenPayload
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          throw new AppError(401, 'TOKEN_EXPIRED', 'Sua sessão expirou. Entre novamente.')
        }
        throw new AppError(401, 'TOKEN_INVALID', 'Sessão inválida. Entre novamente.')
      }
    },
  }
}
export type Jwt = ReturnType<typeof createJwt>
