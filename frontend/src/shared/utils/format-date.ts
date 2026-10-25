// Data curta no fuso de Fortaleza (datas chegam em UTC, `timestamptz`): "24/09/2026".
const formatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza' })

export function formatDate(iso: string): string {
  return formatter.format(new Date(iso))
}
