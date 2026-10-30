import type { ListingDetailRecord, ListingSummaryRecord } from './listings.types'

// Campos mínimos de card e de carrossel: nada de contato nem de vendedor (RN-PER-04).
export const toSummaryView = (r: ListingSummaryRecord) => ({
  id: r.id,
  title: r.title,
  priceInCents: r.priceInCents,
  categoryId: r.categoryId,
  categoryName: r.categoryName,
  imageUrl: r.imageUrl,
  publishedAt: r.publishedAt.toISOString(),
})

// Só rota autenticada devolve o WhatsApp do anúncio (RN-PER-04).
export const toDetailView = (r: ListingDetailRecord, isOwn: boolean) => ({
  id: r.id,
  title: r.title,
  description: r.description,
  priceInCents: r.priceInCents,
  quantity: r.quantity,
  status: r.status,
  categoryId: r.categoryId,
  categoryName: r.categoryName,
  publishedAt: r.publishedAt.toISOString(),
  images: r.images.map(({ id, url }) => ({ id, url })),
  whatsapp: r.whatsapp,
  seller: { name: r.owner.name, course: r.owner.course, verified: r.owner.verified },
  isOwn,
})
