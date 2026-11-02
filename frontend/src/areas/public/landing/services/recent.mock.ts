import type { RecentListing } from './recent.service'

// Dados de exemplo do protótipo (Figma), usados no modo de demonstração (VITE_USE_MOCKS=true). O
// caminho real fica em recent.service.ts.
const recentListings: RecentListing[] = [
  { id: 1, title: 'Cálculo I — Guidorizzi', category: 'Livros e apostilas', priceInCents: 4500, imageUrl: null },
  { id: 2, title: 'Calculadora HP 12C', category: 'Eletrônicos', priceInCents: 12000, imageUrl: null },
  { id: 3, title: 'Jaleco branco — tam. M', category: 'Materiais de curso', priceInCents: 3500, imageUrl: null },
  { id: 4, title: 'Brownie caseiro (kit 3)', category: 'Alimentos', priceInCents: 1200, imageUrl: null },
  { id: 5, title: 'Física I — Halliday', category: 'Livros e apostilas', priceInCents: 6000, imageUrl: null },
  { id: 6, title: 'Fone Bluetooth JBL', category: 'Eletrônicos', priceInCents: 9000, imageUrl: null },
]

export async function getRecentListings(): Promise<RecentListing[]> {
  return recentListings
}
