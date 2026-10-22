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
