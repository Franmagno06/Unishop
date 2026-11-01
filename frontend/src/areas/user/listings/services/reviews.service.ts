import { ApiError } from '../../../../shared/lib/api'
import { getCurrentUser } from '../../../../shared/lib/current-user'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'
import type { NewReview, Review } from '../types/review.types'

// Avaliações de exemplo no formato assumido de GET/POST /listings/:id/reviews (a rota ainda não está
// no backend.md §9). Em memória: o que se publica some ao recarregar. Avaliações estão **fora do MVP**
// (decidido em 01/11/2026): na API real não há rota, então a lista vem vazia e criar é recusado.
// Só em modo de demonstração (MOCK_MODE) valem os exemplos.
const DELAY_MS = 250
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const AUTHORS = ['João Pereira', 'Larissa Moura', 'Bruno Carvalho', 'Camila Souza', 'Diego Martins']
// Nota e comentário andam juntos para o texto combinar com a nota.
const SAMPLES: [number, string][] = [
  [5, 'Item exatamente como descrito. Retirada tranquila no campus.'],
  [4.5, 'Vendedor atencioso e pontual. Recomendo.'],
  [4, 'Valeu a pena pelo preço.'],
  [2, 'Estava pior do que nas fotos e o vendedor demorou a responder.'],
  [1.5, 'Não era o que foi anunciado. Faltavam partes do item.'],
]

let nextId = 1
const created = new Map<number, Review[]>()

// Todo anúncio ganha de 0 a 3 avaliações estáveis; o do Figma (id 1) tem 3 para a tela não ficar vazia.
function exampleReviews(listingId: number): Review[] {
  const count = listingId === 1 ? 3 : listingId % 4
  return Array.from({ length: count }, (_, index) => {
    const seed = listingId + index
    return {
      id: -(listingId * 10 + index),
      listingId,
      authorName: AUTHORS[seed % AUTHORS.length]!,
      rating: SAMPLES[seed % SAMPLES.length]![0],
      comment: SAMPLES[seed % SAMPLES.length]![1],
      createdAt: `2026-10-${String(10 + index).padStart(2, '0')}T14:00:00Z`,
    }
  })
}

export async function getReviews(listingId: number): Promise<Review[]> {
  if (!(import.meta.env.DEV && MOCK_MODE)) return []
  await wait(DELAY_MS)
  return [...(created.get(listingId) ?? []), ...exampleReviews(listingId)]
}

export async function createReview(listingId: number, review: NewReview): Promise<Review> {
  if (!(import.meta.env.DEV && MOCK_MODE)) {
    throw new ApiError(501, 'NOT_IMPLEMENTED', 'As avaliações ainda não estão disponíveis.')
  }
  await wait(DELAY_MS)
  const item: Review = {
    id: nextId++,
    listingId,
    authorName: getCurrentUser().name,
    rating: review.rating,
    comment: review.comment.trim(),
    createdAt: new Date().toISOString(),
  }
  created.set(listingId, [item, ...(created.get(listingId) ?? [])])
  return item
}
