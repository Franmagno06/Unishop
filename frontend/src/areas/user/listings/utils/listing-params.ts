import type { ContactMode, ListingSort } from '../types/listing.types'

// Textos de tela (Figma, tela 07) e valores que vão na URL (?contato= e ?ordem=).
export const CONTACT_LABELS: Record<ContactMode, string> = {
  site: 'Pagamento no site',
  campus: 'No campus',
  whatsapp: 'WhatsApp',
}

export const SORT_LABELS: Record<ListingSort, string> = {
  recent: 'Mais recentes',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
}

// "Mais recentes" é o padrão (RN-ANU-07) e não aparece na URL.
const SORT_TO_PARAM: Record<ListingSort, string | null> = {
  recent: null,
  price_asc: 'menor-preco',
  price_desc: 'maior-preco',
}

// Só aceita número inteiro positivo ("abc", "0", "-1" e "1.5" não são categorias).
export function parseCategoryId(raw: string | undefined): number | null {
  return raw !== undefined && /^[1-9]\d{0,8}$/.test(raw) ? Number(raw) : null
}

export function parseContact(raw: string | null): ContactMode | undefined {
  return raw === 'site' || raw === 'campus' || raw === 'whatsapp' ? raw : undefined
}

export function parseSort(raw: string | null): ListingSort {
  const found = (Object.keys(SORT_TO_PARAM) as ListingSort[]).find((sort) => SORT_TO_PARAM[sort] === raw)
  return found && raw !== null ? found : 'recent'
}

export function sortToParam(sort: ListingSort): string | null {
  return SORT_TO_PARAM[sort]
}
