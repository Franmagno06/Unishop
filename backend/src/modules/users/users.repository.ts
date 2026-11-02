import { AppError } from '../../shared/errors/app-error'
import { anonymizeAccountTx } from '../../shared/database/account-anonymization'
import type { Db } from '../../shared/database/prisma'
import type { ProfileRepository } from './users.types'

// Interrompe a transação de confirmEmailChange quando o e-mail novo já tem dono.
class EmailTakenSignal extends Error {}

export function createPrismaProfileRepository(db: Db): ProfileRepository {
  return {
    // RN-PER-03: transação curta, só com as duas tabelas e sem chamada externa dentro.
    async updateProfile(id, patch) {
      try {
        await db.$transaction(async (tx) => {
          const before = await tx.user.findUniqueOrThrow({
            where: { id },
            select: { whatsapp: true },
          })
          await tx.user.update({ where: { id }, data: patch })
          // Anúncio exige WhatsApp (NOT NULL): limpar o do perfil não apaga o dos anúncios.
          if (patch.whatsapp && patch.whatsapp !== before.whatsapp) {
            await tx.listing.updateMany({
              where: { userId: id, status: 'ativo', deletedAt: null },
              data: { whatsapp: patch.whatsapp },
            })
          }
        })
      } catch (err) {
        // Dois alunos pegando o mesmo e-mail ao mesmo tempo: o índice único em lower(email) decide.
        if ((err as { code?: string }).code === 'P2002') {
          throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.')
        }
        throw err
      }
    },

    // RN-PER-02: o UPDATE condicional no token decide a corrida entre dois confirm; o índice único em
    // lower(email) decide a corrida entre dois donos do mesmo endereço (P2002 desfaz a transação).
    async confirmEmailChange(tokenId, userId, newEmail, at) {
      try {
        return await db.$transaction(async (tx) => {
          const { count } = await tx.userToken.updateMany({
            where: {
              id: tokenId,
              userId,
              type: 'troca_email',
              usedAt: null,
              expiresAt: { gt: at },
            },
            data: { usedAt: at },
          })
          if (count !== 1) return 'invalid' as const
          try {
            await tx.user.update({
              where: { id: userId },
              data: { email: newEmail, verified: true },
            })
          } catch (err) {
            if ((err as { code?: string }).code === 'P2002') throw new EmailTakenSignal()
            throw err
          }
          await tx.userToken.updateMany({
            // Qualquer tipo: um link de senha enviado ao e-mail antigo não vale mais (RN-PER-02).
            where: { userId, usedAt: null },
            data: { usedAt: at },
          })
          return 'ok' as const
        })
      } catch (err) {
        if (err instanceof EmailTakenSignal) return 'taken'
        throw err
      }
    },

    async setPhoto(id, url) {
      await db.user.update({ where: { id }, data: { photoUrl: url } })
    },

    // RN-PER-06: mesma anonimização do admin (src/shared/database), numa transação só.
    async anonymize(id) {
      const result = await db.$transaction((tx) => anonymizeAccountTx(tx, id, new Date()))
      return result.status
    },
  }
}
