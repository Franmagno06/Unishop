export type UserRole = 'student' | 'admin'
export type AuthUser = { id: number; role: UserRole }

declare global {
  namespace Express {
    interface Request {
      requestId: string
      validatedQuery?: unknown
      user?: AuthUser
    }
  }
}
