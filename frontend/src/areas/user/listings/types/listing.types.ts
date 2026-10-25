// Forma de contato do anúncio, como no Figma (tela 07): pagamento no site, encontro no campus
// ou WhatsApp. ATENÇÃO: isso ainda NÃO existe no banco nem na API (o anúncio só guarda o WhatsApp;
// a forma de negociação nasce no pedido). Está nos dados de exemplo até o grupo decidir (roteiro
// de telas, §4 e §9).
export type ContactMode = 'site' | 'campus' | 'whatsapp'

export type ListingSort = 'recent' | 'price_asc' | 'price_desc'

export type ListingSummary = {
  id: number
  title: string
  priceInCents: number // dinheiro em centavos inteiros no código (CLAUDE.md)
  categoryId: number
  contact: { mode: ContactMode; place?: string } // `place`: "Bloco K · Horário EF", só no campus
  imageUrl: string | null // sem foto ainda: o card mostra o bloco azul-claro do Figma
  publishedAt: string
}

// Formato assumido para GET /listings (o openapi.yaml ainda não existe): itens + total + paginação.
export type ListingsPage = {
  items: ListingSummary[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
}

// Detalhe de um anúncio (formato assumido de GET /listings/:id, backend.md §9.4). Sem WhatsApp:
// o contato com o vendedor ainda não está ligado nesta tela.
export type ListingDetail = {
  id: number
  title: string
  priceInCents: number
  description: string
  quantity: number // unidades disponíveis
  categoryId: number
  images: string[] // a primeira é a capa; de 0 a 5
  seller: { name: string; course: string | null }
  isOwn: boolean // anúncio da própria pessoa logada (RN-ANU-10: não faz pedido)
}

// Dados do formulário "Anunciar item" já convertidos (RN-ANU-01): preço em centavos inteiros,
// WhatsApp só com dígitos. O backend recebe isso em POST /listings (backend.md §9.4).
export type NewListing = {
  title: string
  categoryId: number
  description: string
  priceInCents: number
  quantity: number
  whatsapp: string
  images: File[]
}

export type CreatedListing = {
  id: number
  title: string
  categoryId: number
  categoryName: string
}
