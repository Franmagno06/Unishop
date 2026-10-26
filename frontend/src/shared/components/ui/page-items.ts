// Números mostrados: sempre a primeira página, a atual com uma vizinha de cada lado e a última,
// com "…" onde houver salto. Até 5 páginas aparecem todas.
export function pageItems(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const wanted = new Set([1, page - 1, page, page + 1, totalPages])
  const sorted = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)
  const items: (number | 'gap')[] = []
  sorted.forEach((n, index) => {
    if (index > 0 && n - sorted[index - 1]! > 1) items.push('gap')
    items.push(n)
  })
  return items
}
