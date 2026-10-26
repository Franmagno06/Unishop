const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const clock = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Fortaleza',
  hour: '2-digit',
  minute: '2-digit',
})
const fullDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Fortaleza' })
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' })

// Quem não está "logado agora" mostra o tempo desde o último acesso (RN-ADM-03): "Visto há 2 h".
export function formatLastSeen(iso: string, now = Date.now()): string {
  const elapsed = Math.max(0, now - Date.parse(iso))
  if (elapsed < HOUR) return `Visto há ${Math.max(1, Math.floor(elapsed / MINUTE))} min`
  if (elapsed < DAY) return `Visto há ${Math.floor(elapsed / HOUR)} h`
  const days = Math.floor(elapsed / DAY)
  if (days < 30) return `Visto há ${days} ${days === 1 ? 'dia' : 'dias'}`
  return `Visto em ${fullDate.format(new Date(iso))}`
}

// "Hoje, 14:02", "Ontem, 09:30" ou "03/08/2026, 09:30" (fuso de Fortaleza; as datas chegam em UTC).
export function formatLastAccess(iso: string, now = Date.now()): string {
  const date = new Date(iso)
  const today = dayKey.format(new Date(now))
  const yesterday = dayKey.format(new Date(now - DAY))
  const day = dayKey.format(date)
  const time = clock.format(date)
  if (day === today) return `Hoje, ${time}`
  if (day === yesterday) return `Ontem, ${time}`
  return `${fullDate.format(date)}, ${time}`
}
