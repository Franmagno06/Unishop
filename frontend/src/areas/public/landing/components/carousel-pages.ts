// Páginas do carrossel (2 cartões por página), calculadas pela rolagem. Com número ímpar de cartões, a
// rolagem máxima fica antes do início da última página: o fim da rolagem conta como a última página, e
// ir a uma página nunca passa da rolagem máxima.

// Página atual a partir da rolagem. `maxScroll` = scrollWidth - clientWidth.
export function pageFromScroll(
  scrollLeft: number,
  pageWidth: number,
  maxScroll: number,
  pageCount: number,
): number {
  if (pageWidth <= 0) return 0
  if (maxScroll > 0 && scrollLeft >= maxScroll - 1) return pageCount - 1
  return Math.min(pageCount - 1, Math.max(0, Math.round(scrollLeft / pageWidth)))
}

// Rolagem que leva ao início de uma página, sem passar do máximo possível.
export function scrollForPage(page: number, pageWidth: number, maxScroll: number): number {
  return Math.min(page * pageWidth, Math.max(0, maxScroll))
}
