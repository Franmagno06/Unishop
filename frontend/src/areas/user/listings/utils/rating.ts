export const MAX_STARS = 5

// Clique na estrela `star` (1 a 5): 1º clique marca a estrela inteira, 2º deixa meia, 3º tira.
// Com a nota em 3, clicar na 3ª estrela leva a 2,5 e depois a 2; clicar na 5ª leva direto a 5.
export function nextRating(current: number, star: number): number {
  if (current >= star) return star - 0.5
  if (current === star - 0.5) return star - 1
  return star
}

// Quanto da estrela `star` (1 a 5) está preenchido para a nota dada: 0, 0,5 ou 1.
export function starFill(rating: number, star: number): 0 | 0.5 | 1 {
  if (rating >= star) return 1
  if (rating >= star - 0.5) return 0.5
  return 0
}

export function averageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0
  return ratings.reduce((sum, value) => sum + value, 0) / ratings.length
}

// 4.5 -> "4,5"; 4 -> "4,0".
export function formatRating(value: number): string {
  return value.toFixed(1).replace('.', ',')
}
