import type { ListingStatus } from '../../shared/types'

export type AdminCategory = { id: number; name: string }

export type AdminProductSeller = { id: number; name: string; email: string; whatsapp: string }

export type AdminProductImage = { id: number; url: string | null }

// Produto (anúncio) na visão do admin, formato assumido de GET /admin/listings/:id (backend.md §9).
export type AdminProduct = {
  id: number
  title: string
  description: string
  priceInCents: number
  categoryId: number
  categoryName: string
  status: ListingStatus
  whatsapp: string // só dígitos; é o contato do anúncio (RN-ANU-01)
  seller: AdminProductSeller
  images: AdminProductImage[]
  views: number
  whatsappContacts: number
  publishedAt: string // ISO (UTC)
}

export type ProductStats = { active: number; paused: number; soldInMonth: number }

export type ProductListQuery = {
  search: string
  categoryId: number | null
  page: number
}

// O admin edita só o status do anúncio (decisão de 26/10/2026): Ativo ou Pausado. Quem já está
// Vendido pode ser revertido pelo admin (Regras §3).
export type UpdateProductInput = { status: ListingStatus }
