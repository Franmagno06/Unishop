export type AuthUser = { id: number; name: string; role: 'student' | 'admin' }
export type LoginResponse = { data: { token: string; user: AuthUser } }
export type RegisterResponse = { data: { user: AuthUser } }
