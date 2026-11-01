import { AppError } from '../../shared/errors/app-error'
import type { ListingStatus } from '../../modules/listings/listings.types'

// RN-ADM-07 (Decisão 5, recomendação do plano): "vendidos no mês" = mês do calendário em Fortaleza
// (UTC-3, sem horário de verão). Devolve o instante UTC do dia 1 às 00h locais (03h UTC).
const FORTALEZA_OFFSET_HOURS = 3

export function startOfSalesMonth(now: Date): Date {
  const local = new Date(now.getTime() - FORTALEZA_OFFSET_HOURS * 3_600_000)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1, FORTALEZA_OFFSET_HOURS))
}

// RN-ADM-08, Regras §4 (Decisão 4, recomendação do plano): Vendido volta sempre a Pausado (e `vendido_em`
// é limpo, porque o anúncio deixou de estar vendido); qualquer troca para Ativo com quantidade 0 dá 409.
// O admin não muda a quantidade: o dono, com o anúncio Pausado, repõe as unidades e reativa.
export function assertAdminCanTransition(
  from: ListingStatus,
  to: 'active' | 'paused',
  quantity: number,
): { clearSoldAt: boolean } {
  if (to === 'active' && quantity <= 0) {
    throw new AppError(
      409,
      'INVALID_STATE',
      'O anúncio não tem unidades. O vendedor precisa informar a quantidade antes de reativar.',
    )
  }
  return { clearSoldAt: from === 'sold' }
}
