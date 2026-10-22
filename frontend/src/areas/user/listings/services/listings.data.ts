import type { ContactMode, ListingSummary } from '../types/listing.types'

// Dados de exemplo (preços fictícios). As contagens por categoria são as da tela de Categorias
// (Figma 04): 48, 21, 35, 27, 12 e 9. A tela de Categorias lê as contagens DAQUI, para as duas
// telas nunca divergirem. Os 8 primeiros de "Livros e apostilas" são exatamente os do Figma (tela 07).
const TOTALS: Record<number, number> = { 1: 48, 2: 21, 3: 35, 4: 27, 5: 12, 6: 9 }

type Seed = { title: string; reais: number; mode: ContactMode; place?: string }

const FIGMA_BOOKS: Seed[] = [
  { title: 'Cálculo I — Guidorizzi, vol. 1', reais: 45, mode: 'site' },
  { title: 'Física I — Halliday, 10ª ed.', reais: 60, mode: 'campus', place: 'Bloco K · Horário EF' },
  { title: 'Apostila de Anatomia Humana', reais: 25, mode: 'whatsapp' },
  { title: 'Algoritmos — Cormen', reais: 90, mode: 'site' },
  { title: 'Química Geral — Russell', reais: 40, mode: 'campus', place: 'Bloco D · Horário CD' },
  { title: 'Direito Constitucional — Lenza', reais: 55, mode: 'whatsapp' },
  { title: 'Estatística Básica — Bussab', reais: 35, mode: 'site' },
  { title: 'Introdução à Economia — Mankiw', reais: 50, mode: 'campus', place: 'Bloco A · Horário AB' },
]

const BASE_TITLES: Record<number, string[]> = {
  1: [
    'Álgebra Linear — Boldrini',
    'Cálculo II — Stewart',
    'Estruturas de Dados — Tenenbaum',
    'Biologia Celular — Alberts',
    'Redes de Computadores — Kurose',
    'Fisiologia Humana — Guyton',
    'Contabilidade Geral — Iudícibus',
    'Sociologia Geral — Giddens',
  ],
  2: [
    'Calculadora HP 12C',
    'Fone Bluetooth JBL',
    'Mouse sem fio Logitech',
    'Teclado mecânico compacto',
    'Carregador portátil 10.000 mAh',
    'Pen drive 64 GB',
    'Monitor 22 polegadas',
    'Calculadora científica Casio',
    'Webcam Full HD',
    'Hub USB-C',
  ],
  3: [
    'Brownie caseiro (kit 3)',
    'Cookies de aveia (pacote)',
    'Pão de mel (unidade)',
    'Bolo de pote',
    'Salgados congelados (dúzia)',
    'Granola artesanal 300 g',
    'Café coado 250 g',
    'Brigadeiro gourmet (caixa)',
  ],
  4: [
    'Jaleco branco — tam. M',
    'Kit de canetas técnicas',
    'Prancheta A3',
    'Compasso profissional',
    'Estetoscópio básico',
    'Régua de cálculo',
    'Caderno de desenho A4',
    'Kit de pincéis',
  ],
  5: [
    'Camiseta da Atlética — tam. G',
    'Moletom Unifor — tam. M',
    'Boné da turma',
    'Jaqueta jeans — tam. P',
    'Tênis casual nº 40',
    'Mochila escolar',
  ],
  6: [
    'Garrafa térmica 500 ml',
    'Mochila de notebook',
    'Cadeira de estudo dobrável',
    'Luminária de mesa',
    'Fichário universitário',
    'Estante de livros pequena',
  ],
}

// Faixa de preço fictícia por categoria, em reais.
const PRICE_RANGE: Record<number, [number, number]> = {
  1: [15, 120],
  2: [20, 500],
  3: [5, 40],
  4: [10, 150],
  5: [20, 120],
  6: [15, 200],
}

const VARIANTS = ['usado, bom estado', 'seminovo', 'edição anterior', 'lote com 2', 'completo', 'com anotações']
const BLOCKS = ['A', 'B', 'C', 'D', 'K']
const TIMES = ['AB', 'CD', 'EF', 'GH']
const MODES: ContactMode[] = ['site', 'campus', 'whatsapp']

// Gerador pseudoaleatório com semente: os mesmos números a cada execução (testes estáveis).
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFor(categoryId: number, index: number): Seed {
  if (categoryId === 1 && index < FIGMA_BOOKS.length) return FIGMA_BOOKS[index]!

  const base = BASE_TITLES[categoryId] ?? ['Item']
  const lap = Math.floor(index / base.length)
  const name = base[index % base.length]!
  const title = lap === 0 ? name : `${name} (${VARIANTS[(lap - 1) % VARIANTS.length]})`

  const [min, max] = PRICE_RANGE[categoryId] ?? [10, 100]
  const random = seeded(categoryId * 1000 + index)
  const reais = Math.round((min + random() * (max - min)) / 5) * 5

  const mode = MODES[index % MODES.length]!
  const place =
    mode === 'campus' ? `Bloco ${BLOCKS[index % BLOCKS.length]} · Horário ${TIMES[index % TIMES.length]}` : undefined
  return { title, reais, mode, place }
}

const NEWEST = Date.UTC(2026, 9, 21, 12, 0, 0)
const THREE_HOURS = 3 * 60 * 60 * 1000

function build(): ListingSummary[] {
  const all: ListingSummary[] = []
  let id = 1
  for (const [categoryKey, total] of Object.entries(TOTALS)) {
    const categoryId = Number(categoryKey)
    for (let index = 0; index < total; index++) {
      const seed = seedFor(categoryId, index)
      all.push({
        id: id++,
        title: seed.title,
        priceInCents: seed.reais * 100,
        categoryId,
        contact: seed.place ? { mode: seed.mode, place: seed.place } : { mode: seed.mode },
        imageUrl: null,
        // dentro de cada categoria, o primeiro é o mais recente (RN-ANU-07)
        publishedAt: new Date(NEWEST - index * THREE_HOURS).toISOString(),
      })
    }
  }
  return all
}

export const exampleListings: ListingSummary[] = build()

export function listingCountByCategory(categoryId: number): number {
  return TOTALS[categoryId] ?? 0
}
