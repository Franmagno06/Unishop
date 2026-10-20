// Dados de exemplo do protótipo (Figma). Trocar pela API quando o contrato existir: o carrossel da
// tela inicial é público (frontend.md §11), mas a rota exata ainda não está no openapi.yaml.
export type RecentListing = {
  id: number
  title: string
  category: string
  priceInCents: number
}

export const recentListings: RecentListing[] = [
  { id: 1, title: 'Cálculo I — Guidorizzi', category: 'Livros e apostilas', priceInCents: 4500 },
  { id: 2, title: 'Calculadora HP 12C', category: 'Eletrônicos', priceInCents: 12000 },
  { id: 3, title: 'Jaleco branco — tam. M', category: 'Materiais de curso', priceInCents: 3500 },
  { id: 4, title: 'Brownie caseiro (kit 3)', category: 'Alimentos', priceInCents: 1200 },
  { id: 5, title: 'Física I — Halliday', category: 'Livros e apostilas', priceInCents: 6000 },
  { id: 6, title: 'Fone Bluetooth JBL', category: 'Eletrônicos', priceInCents: 9000 },
]
