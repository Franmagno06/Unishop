import { DAY, DEMO_NOW } from '../../shared/services/mock-utils'
import type { ListingStatus } from '../../shared/types'
import { findUser, isUserDeleted } from '../../users/services/users.data'
import type { AdminCategory, AdminProduct } from '../types/product.types'

// Dados de exemplo da área admin (Figma A03 a A05): os 8 primeiros são os do Figma; o resto é
// gerado de forma fixa até fechar os 266 produtos (152 ativos, 18 pausados, 96 vendidos).
export const CATEGORIES: AdminCategory[] = [
  { id: 1, name: 'Livros e apostilas' },
  { id: 2, name: 'Eletrônicos' },
  { id: 3, name: 'Alimentos' },
  { id: 4, name: 'Materiais de curso' },
  { id: 5, name: 'Vestuário' },
  { id: 6, name: 'Outros' },
]
export const TOTAL_PRODUCTS = 266
const categoryName = (id: number) => CATEGORIES.find((category) => category.id === id)!.name

// Produtos com pedido Pago em aberto não podem ser excluídos (RN-ADM-09).
export const PRODUCTS_WITH_OPEN_PAID_ORDERS: ReadonlySet<number> = new Set([1])

type Seed = {
  id: number
  title: string
  description: string
  reais: number
  categoryId: number
  sellerId: number
  status: ListingStatus
  images: number
  daysAgo: number
  views: number
  contacts: number
}

const FIGMA: Seed[] = [
  { id: 1, title: 'Cálculo I — Guidorizzi, vol. 1', description: 'Livro em ótimo estado, 5ª edição, sem rasuras e com poucas marcações a lápis. Usado apenas no semestre passado.', reais: 45, categoryId: 1, sellerId: 2, status: 'active', images: 3, daysAgo: 45, views: 128, contacts: 9 },
  { id: 2, title: 'Calculadora HP 12C', description: 'Funcionando perfeitamente, com capa protetora e manual.', reais: 120, categoryId: 2, sellerId: 1, status: 'active', images: 2, daysAgo: 40, views: 87, contacts: 5 },
  { id: 3, title: 'Física I — Halliday, 10ª ed.', description: 'Volume 1 completo, capa com leve desgaste.', reais: 60, categoryId: 1, sellerId: 3, status: 'paused', images: 2, daysAgo: 38, views: 54, contacts: 3 },
  { id: 4, title: 'Apostila de Anatomia Humana', description: 'Resumos por sistema com esquemas coloridos.', reais: 25, categoryId: 1, sellerId: 4, status: 'active', images: 1, daysAgo: 30, views: 41, contacts: 2 },
  { id: 5, title: 'Brownie caseiro (kit 3)', description: 'Feitos no dia, entrega no Bloco J às 10h.', reais: 12, categoryId: 3, sellerId: 6, status: 'active', images: 1, daysAgo: 12, views: 96, contacts: 11 },
  { id: 6, title: 'Jaleco branco — tam. M', description: 'Usado por um semestre, sem manchas.', reais: 35, categoryId: 4, sellerId: 7, status: 'sold', images: 2, daysAgo: 20, views: 63, contacts: 4 },
  { id: 7, title: 'Kit de desenho técnico', description: 'Esquadros, compasso e escalímetro em estojo rígido.', reais: 70, categoryId: 4, sellerId: 2, status: 'active', images: 2, daysAgo: 25, views: 38, contacts: 2 },
  { id: 8, title: 'Calculadora Casio fx-82', description: 'Científica, com capa. Funciona perfeitamente.', reais: 40, categoryId: 2, sellerId: 2, status: 'sold', images: 1, daysAgo: 12, views: 72, contacts: 6 },
]

const TITLES: Record<number, string[]> = {
  1: ['Álgebra Linear — Boldrini', 'Cálculo II — Stewart', 'Estruturas de Dados — Tenenbaum', 'Biologia Celular — Alberts', 'Redes de Computadores — Kurose', 'Fisiologia Humana — Guyton', 'Contabilidade Geral — Iudícibus'],
  2: ['Fone Bluetooth JBL', 'Mouse sem fio Logitech', 'Teclado mecânico compacto', 'Carregador portátil 10.000 mAh', 'Pen drive 64 GB', 'Monitor 22 polegadas', 'Webcam Full HD'],
  3: ['Cookies de aveia (pacote)', 'Pão de mel (unidade)', 'Bolo de pote', 'Salgados congelados (dúzia)', 'Granola artesanal 300 g', 'Café coado 250 g', 'Brigadeiro gourmet (caixa)'],
  4: ['Kit de canetas técnicas', 'Prancheta A3', 'Compasso profissional', 'Estetoscópio básico', 'Régua de cálculo', 'Caderno de desenho A4', 'Kit de pincéis'],
  5: ['Camiseta da Atlética — tam. G', 'Moletom Unifor — tam. M', 'Boné da turma', 'Jaqueta jeans — tam. P', 'Tênis casual nº 40', 'Mochila escolar'],
  6: ['Garrafa térmica 500 ml', 'Mochila de notebook', 'Cadeira de estudo dobrável', 'Luminária de mesa', 'Fichário universitário', 'Estante de livros pequena'],
}
const CONDITIONS = ['Em bom estado, pouco uso.', 'Seminovo, sem defeitos.', 'Usado, funcionando bem.', 'Lacrado, nunca usado.']

function generated(): Seed[] {
  const count = TOTAL_PRODUCTS - FIGMA.length // 258
  // O Figma já tem 5 ativos, 1 pausado e 2 vendidos: o resto fecha 152, 18 e 96.
  const pool: ListingStatus[] = [
    ...Array<ListingStatus>(147).fill('active'),
    ...Array<ListingStatus>(17).fill('paused'),
    ...Array<ListingStatus>(count - 147 - 17).fill('sold'),
  ]
  return Array.from({ length: count }, (_, k) => {
    const status = pool[(k * 37) % count]! // 37 e 258 não têm divisor em comum: usa cada posição uma vez
    const categoryId = 1 + (k % CATEGORIES.length)
    const titles = TITLES[categoryId]!
    return {
      id: FIGMA.length + 1 + k,
      title: titles[(k * 5 + Math.floor(k / titles.length)) % titles.length]!,
      description: `${CONDITIONS[k % CONDITIONS.length]} Retirada no campus.`,
      reais: 10 + ((k * 17) % 190),
      categoryId,
      // Os vendedores se concentram nos 60 primeiros alunos, para cada um ter alguns anúncios.
      sellerId: 1 + ((k * 131 + Math.floor(k / 60) * 7) % 60),
      status,
      images: 1 + (k % 3),
      // Vendidos nos últimos 30 dias, para o indicador "Vendidos no mês".
      daysAgo: status === 'sold' ? (k * 13) % 29 : 30 + ((k * 11) % 120),
      views: 10 + ((k * 29) % 240),
      contacts: (k * 7) % 14,
    }
  })
}

function build(): AdminProduct[] {
  return [...FIGMA, ...generated()].map((seed) => {
    const seller = findUser(seed.sellerId)!
    return {
      id: seed.id,
      title: seed.title,
      description: seed.description,
      priceInCents: seed.reais * 100,
      categoryId: seed.categoryId,
      categoryName: categoryName(seed.categoryId),
      status: seed.status,
      whatsapp: seller.whatsapp,
      seller: { id: seller.id, name: seller.name, email: seller.email, whatsapp: seller.whatsapp },
      images: Array.from({ length: seed.images }, (_, index) => ({ id: seed.id * 10 + index, url: null })),
      views: seed.views,
      whatsappContacts: seed.contacts,
      publishedAt: new Date(DEMO_NOW - seed.daysAgo * DAY).toISOString(),
    }
  })
}

let products: AdminProduct[] = build()
const deletedIds = new Set<number>()

// Saem do painel os produtos excluídos e os de quem foi excluído (anonimizado).
export const getAllProducts = (): AdminProduct[] =>
  products.filter((product) => !deletedIds.has(product.id) && !isUserDeleted(product.seller.id))
export const findProduct = (id: number): AdminProduct | undefined =>
  getAllProducts().find((product) => product.id === id)
export const saveProduct = (changed: AdminProduct): void => {
  products = products.map((product) => (product.id === changed.id ? changed : product))
}
export const markProductDeleted = (id: number): void => void deletedIds.add(id)

// Só para os testes: volta ao estado inicial.
export function resetProductsData(): void {
  products = build()
  deletedIds.clear()
}
