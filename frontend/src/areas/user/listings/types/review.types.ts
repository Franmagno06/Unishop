// Avaliação de um anúncio, de 0 a 5 estrelas em passos de 0,5. Ainda não existe nos documentos
// (Regras, Banco, Backend): é formato assumido, com dados de exemplo, até o grupo decidir.
export type Review = {
  id: number
  listingId: number
  authorName: string
  rating: number // 0, 0.5, 1 ... 5
  comment: string
  createdAt: string // ISO (UTC)
}

export type NewReview = { rating: number; comment: string }
