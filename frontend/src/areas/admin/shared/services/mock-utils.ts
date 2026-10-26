// Apoio dos dados de exemplo da área admin (some quando a API existir).
export const DELAY_MS = 250
export const wait = (ms = DELAY_MS) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// O relógio da demonstração para no instante em que a página abre: "logado agora" e "novos nesta
// semana" não mudam sozinhos enquanto alguém mostra as telas.
export const DEMO_NOW = Date.now()
export const MINUTE = 60_000
export const DAY = 24 * 60 * MINUTE

export function paginate<T>(all: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize))
  const current = Math.min(Math.max(1, page), totalPages)
  return {
    items: all.slice((current - 1) * pageSize, current * pageSize),
    total: all.length,
    page: current,
    pageSize,
    totalPages,
  }
}

// Busca sem diferenciar maiúsculas nem acentos, como na tela de Categorias.
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}
