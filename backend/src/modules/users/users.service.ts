import { EMAIL_CHANGE_MINUTES } from '../../config/constants'
import type { TokenRepository, UserRecord, UserRepository } from '../auth/auth.types'
import { AppError, hasOpenPaidOrders } from '../../shared/errors/app-error'
import type { MailProvider } from '../../shared/providers/mail/mail.provider'
import { generateToken, hashToken } from '../../shared/utils/hash'
import type { StorageProvider } from '../../shared/providers/storage/storage.provider'
import type { MyProfile, ProfilePatch, ProfileRepository } from './users.types'

export type UsersDeps = {
  users: UserRepository
  profiles: ProfileRepository
  tokens: TokenRepository
  mail: MailProvider
  config: { allowedEmailDomain: string; frontendUrl: string }
  now?: () => Date
  /** Sem storage a rota de foto não é montada. */
  storage?: StorageProvider
}

export function createUsersService({
  users,
  profiles,
  tokens,
  mail,
  config,
  storage,
  now = () => new Date(),
}: UsersDeps) {
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

  // RN-PER-01, 03, 07. O e-mail não troca por aqui (RN-PER-02): a tela manda o e-mail atual junto
  // com os demais campos, então o igual é ignorado e o diferente é recusado (D2).
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
    if (
      input.email !== undefined &&
      input.email.trim().toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Para trocar o e-mail, use a confirmação por link.',
        [{ field: 'email', message: 'Para trocar o e-mail, use a confirmação por link.' }],
      )
    }
    const patch: ProfilePatch = {}
    if (input.name !== undefined) patch.name = input.name
    if (input.course !== undefined) patch.course = input.course || null
    if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp || null

    if (Object.keys(patch).length > 0) await profiles.updateProfile(userId, patch)
    return me(userId)
  }

  // RN-PER-02, RF013.4: o novo endereço (@edu.unifor.br, único) recebe um link de `EMAIL_CHANGE_MINUTES`
  // minutos e uso único; só o hash do token vai ao banco. O envio usa await (e-mail de segurança) e
  // falha vira 502 sem detalhe. Vale para aluno e admin (D6); o JWT não leva e-mail, então as
  // sessões continuam (D5).
  async function requestEmailChange(userId: number, rawEmail: string) {
    const user = await load(userId)
    const email = rawEmail.trim().toLowerCase()
    if (!email.endsWith(`@${config.allowedEmailDomain}`)) {
      throw new AppError(
        403,
        'EMAIL_DOMAIN_NOT_ALLOWED',
        `Use seu e-mail institucional @${config.allowedEmailDomain}.`,
      )
    }
    if (email === user.email.toLowerCase()) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Este já é o seu e-mail.')
    }
    if (await users.findByEmail(email)) {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.')
    }

    const at = now()
    const token = generateToken()
    await tokens.invalidatePending(userId, 'troca_email', at)
    await tokens.create({
      userId,
      type: 'troca_email',
      tokenHash: hashToken(token),
      expiresAt: new Date(at.getTime() + EMAIL_CHANGE_MINUTES * 60_000),
      newEmail: email,
    })
    try {
      await mail.sendEmailChange({
        to: email,
        name: user.name,
        link: `${config.frontendUrl}/confirmar-troca-email/${token}`,
        expiresInMinutes: EMAIL_CHANGE_MINUTES,
      })
    } catch {
      throw new AppError(
        502,
        'EXTERNAL_SERVICE_ERROR',
        'Não foi possível enviar o e-mail agora. Tente novamente.',
      )
    }
    return { pendingEmail: email, expiresInMinutes: EMAIL_CHANGE_MINUTES }
  }

  // RN-PER-02: só o dono do link confirma (D4). Ausente, usado, de outro tipo ou de outro usuário
  // dá o mesmo TOKEN_INVALID. O consumo do token e a troca são uma transação só (profiles).
  async function confirmEmailChange(userId: number, token: string) {
    await load(userId)
    const at = now()
    const record = await tokens.findByHash(hashToken(token), 'troca_email')
    if (!record || record.usedAt || record.userId !== userId || !record.newEmail) {
      throw new AppError(400, 'TOKEN_INVALID', 'Link inválido.')
    }
    if (record.expiresAt <= at) {
      throw new AppError(400, 'TOKEN_EXPIRED', 'Link expirado. Peça outro.')
    }
    if (!record.newEmail.endsWith(`@${config.allowedEmailDomain}`)) {
      throw new AppError(
        403,
        'EMAIL_DOMAIN_NOT_ALLOWED',
        `Use seu e-mail institucional @${config.allowedEmailDomain}.`,
      )
    }
    const result = await profiles.confirmEmailChange(record.id, userId, record.newEmail, at)
    if (result === 'invalid') throw new AppError(400, 'TOKEN_INVALID', 'Link inválido.')
    if (result === 'taken') {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.')
    }
    return me(userId)
  }

  // RN-PER-05: JPG ou PNG de até 4 MB (o middleware de upload já conferiu). Vale para aluno e admin.
  // A foto antiga fica no storage: o banco guarda só a URL, sem o publicId para apagá-la.
  async function setAvatar(userId: number, image: Buffer) {
    if (!storage) throw new Error('Foto de perfil sem StorageProvider.')
    await load(userId)
    const stored = await storage.upload({ buffer: image, folder: 'avatars' })
    try {
      await profiles.setPhoto(userId, stored.url)
    } catch (err) {
      await storage.remove(stored.publicId).catch(() => undefined)
      throw err
    }
    return me(userId)
  }

  // RN-PER-06: bloqueada com pedido pago ou com retirada combinada em aberto; cancela Pendente e Em negociação.
  async function deleteAccount(userId: number) {
    const user = await load(userId)
    if (user.role === 'admin') {
      throw new AppError(
        403,
        'ADMIN_PROTECTED',
        'A conta de administrador não pode ser excluída aqui.',
      )
    }
    const result = await profiles.anonymize(userId)
    if (result === 'blocked') {
      throw hasOpenPaidOrders(
        'Há pedido pago ou com retirada combinada em aberto. Conclua a entrega antes de excluir a conta.',
      )
    }
    if (result === 'not_found')
      throw new AppError(401, 'UNAUTHENTICATED', 'Faça login para continuar.')
  }

  return { me, updateProfile, requestEmailChange, confirmEmailChange, setAvatar, deleteAccount }
}
export type UsersService = ReturnType<typeof createUsersService>
