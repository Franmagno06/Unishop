import type { UserRecord, UserRepository } from '../auth/auth.types'
import { AppError } from '../../shared/errors/app-error'
import type { MyProfile, ProfilePatch, ProfileRepository } from './users.types'

export type UsersDeps = {
  users: UserRepository
  profiles: ProfileRepository
  config: { allowedEmailDomain: string }
}

export function createUsersService({ users, profiles, config }: UsersDeps) {
  async function load(userId: number): Promise<UserRecord> {
    const user = await users.findById(userId)
    if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Faça login para continuar.')
    return user
  }

  const toProfile = (user: UserRecord): MyProfile => ({
    id: user.id,
    name: user.name,
    email: user.email,
    course: user.course,
    whatsapp: user.whatsapp,
    avatarUrl: user.photoUrl,
    role: user.role,
  })

  // RF012.1
  async function me(userId: number) {
    return { user: toProfile(await load(userId)) }
  }

  // RN-PER-01, 03, 07. O e-mail troca direto (sem link de confirmação, decisão do gestor para esta
  // fase; a RN-PER-02 pede confirmação no novo endereço), mas segue @edu.unifor.br e único (RN-ACE-02, 03).
  async function updateProfile(
    userId: number,
    input: {
      name?: string | undefined
      email?: string | undefined
      course?: string | undefined
      whatsapp?: string | undefined
    },
  ) {
    const user = await load(userId)
    const patch: ProfilePatch = {}
    if (input.name !== undefined) patch.name = input.name
    if (input.course !== undefined) patch.course = input.course || null
    if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp || null

    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase()
      if (email !== user.email.toLowerCase()) {
        if (!email.endsWith(`@${config.allowedEmailDomain}`)) {
          throw new AppError(
            403,
            'EMAIL_DOMAIN_NOT_ALLOWED',
            `Use seu e-mail institucional @${config.allowedEmailDomain}.`,
          )
        }
        const taken = await users.findByEmail(email)
        if (taken && taken.id !== userId) {
          throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.')
        }
        patch.email = email
      }
    }

    if (Object.keys(patch).length > 0) await profiles.updateProfile(userId, patch)
    return me(userId)
  }

  // RN-PER-06. Ainda não confere pedidos pagos em aberto (409 HAS_OPEN_PAID_ORDERS): entra com os pedidos.
  async function deleteAccount(userId: number) {
    const user = await load(userId)
    if (user.role === 'admin') {
      throw new AppError(
        403,
        'ADMIN_PROTECTED',
        'A conta de administrador não pode ser excluída aqui.',
      )
    }
    await profiles.anonymize(userId)
  }

  return { me, updateProfile, deleteAccount }
}
export type UsersService = ReturnType<typeof createUsersService>
