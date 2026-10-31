// RN-ADM-07 (Decisão 5, recomendação do plano): "vendidos no mês" = mês do calendário em Fortaleza
// (UTC-3, sem horário de verão). Devolve o instante UTC do dia 1 às 00h locais (03h UTC).
const FORTALEZA_OFFSET_HOURS = 3

export function startOfSalesMonth(now: Date): Date {
  const local = new Date(now.getTime() - FORTALEZA_OFFSET_HOURS * 3_600_000)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1, FORTALEZA_OFFSET_HOURS))
}
