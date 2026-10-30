import { AppError } from '../../shared/errors/app-error'
import type { Db } from '../../shared/database/prisma'
import type { ProfileRepository } from './users.types'

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

    // RN-PER-06: a linha continua (pedidos pagos mantêm o histórico), mas sem dado pessoal. Os links
    // pendentes (recuperação de senha) somem para ninguém reabrir a conta.
    async anonymize(id) {
      await db.$transaction([
        db.user.update({
          where: { id },
          data: {
            name: 'Usuário removido',
            email: `removido_${id}@removido.invalid`,
            passwordHash: null,
            googleSub: null,
            whatsapp: null,
            course: null,
            photoUrl: null,
            accountStatus: 'excluida',
          },
        }),
        db.userToken.deleteMany({ where: { userId: id } }),
      ])
    },
  }
}
