import { exampleImages } from './example-images'
import type { ListingDetail, ListingSummary } from '../types/listing.types'

// Detalhe de exemplo de cada anúncio (formato assumido de GET /listings/:id, backend.md §9.4):
// descrição, quantidade, fotos e vendedor. O anúncio do Figma e os gerados usam textos de
// exemplo estáveis (os mesmos a cada execução); os publicados na tela "Anunciar item" guardam
// o que a pessoa digitou.
type Seller = ListingDetail['seller']

const SELLERS: Seller[] = [
  { name: 'Bruno Carvalho', course: 'Ciência da Computação' },
  { name: 'Camila Souza', course: 'Medicina' },
  { name: 'Diego Martins', course: 'Direito' },
  { name: 'Elisa Nogueira', course: 'Administração' },
  { name: 'Felipe Araújo', course: 'Psicologia' },
  { name: 'Gabriela Rocha', course: 'Arquitetura e Urbanismo' },
  { name: 'Henrique Lopes', course: 'Odontologia' },
]

const FIGMA_SELLER: Seller = { name: 'Ana Lima', course: 'Engenharia Civil' }
const FIGMA_DESCRIPTION =
  'Livro em ótimo estado, 5ª edição, sem rasuras e com poucas marcações a lápis. Usado apenas no semestre passado na disciplina de Cálculo I.'

const DESCRIPTIONS: Record<number, string[]> = {
  1: [
    'Exemplar em bom estado, com algumas anotações a lápis nas margens. Usado em apenas um semestre.',
    'Capa e miolo conservados, sem folhas soltas. Ótimo para quem vai cursar a disciplina agora.',
    'Edição recente, sem grifos. Retirada no campus em horário combinado.',
  ],
  2: [
    'Funciona perfeitamente, com pouco tempo de uso. Acompanha cabo e caixa original.',
    'Equipamento revisado, sem arranhões visíveis. Aceito testar na hora da retirada.',
    'Usado só nas aulas, em ótimo estado. Garanto o funcionamento.',
  ],
  3: [
    'Feito em casa no dia anterior, com ingredientes frescos. Entrego embalado no campus.',
    'Produção artesanal em pequenas quantidades. Encomendas com um dia de antecedência.',
    'Receita da família, sem conservantes. Ótimo para o lanche entre as aulas.',
  ],
  4: [
    'Material em bom estado, usado apenas em um semestre. Indicado para o início do curso.',
    'Peça completa, sem defeitos. Vendo porque não vou mais usar.',
    'Pouco uso, bem cuidado. Retirada no campus.',
  ],
  5: [
    'Peça em ótimo estado, lavada e pronta para uso. Tamanho conforme o título do anúncio.',
    'Usada poucas vezes, sem manchas nem desgaste. Posso enviar mais fotos pelo WhatsApp.',
    'Comprei e não usei o suficiente. Retirada no campus.',
  ],
  6: [
    'Em bom estado e funcionando bem. Retirada no campus em horário combinado.',
    'Pouco usado, sem avarias. Aceito combinar o melhor horário para você.',
    'Item conservado, vendo por não precisar mais.',
  ],
}

export function exampleDetail(summary: ListingSummary): ListingDetail {
  const isFigma = summary.id === 1
  const descriptions = DESCRIPTIONS[summary.categoryId] ?? DESCRIPTIONS[6]!
  return {
    id: summary.id,
    title: summary.title,
    priceInCents: summary.priceInCents,
    description: isFigma ? FIGMA_DESCRIPTION : descriptions[summary.id % descriptions.length]!,
    quantity: isFigma ? 1 : summary.id % 5 === 0 ? 3 : 1,
    categoryId: summary.categoryId,
    images: exampleImages(summary.id, summary.categoryId, summary.title),
    seller: isFigma ? FIGMA_SELLER : SELLERS[summary.id % SELLERS.length]!,
    isOwn: false,
  }
}

// Anúncios publicados nesta sessão (tela "Anunciar item"): somem ao recarregar a página.
const createdDetails = new Map<number, ListingDetail>()

export function registerCreatedDetail(detail: ListingDetail): void {
  createdDetails.set(detail.id, detail)
}

export function getCreatedDetail(id: number): ListingDetail | undefined {
  return createdDetails.get(id)
}

export const DEMO_STUDENT: Seller = { name: 'Aluno Teste', course: null }
