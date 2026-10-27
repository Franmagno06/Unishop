import { useRef } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { useReachEnd } from '../../../../shared/hooks/use-reach-end'
import { ListingFilters } from '../components/ListingFilters'
import { ListingGrid } from '../components/ListingGrid'
import { useCategory } from '../hooks/use-category'
import { useListings } from '../hooks/use-listings'
import type { ContactMode, ListingSort } from '../types/listing.types'
import { parseCategoryId, parseContact, parseSort, sortToParam } from '../utils/listing-params'

const FIRST_LOAD_SKELETONS = 8
const NEXT_PAGE_SKELETONS = 4

const countLabel = (count: number) => `${count} ${count === 1 ? 'anúncio' : 'anúncios'}`

// RF007 · RN-ANU-05 a 07. Lista os anúncios de uma categoria com rolagem infinita: a próxima página
// é pedida ao chegar perto do fim. Filtro de contato e ordem ficam na URL (?contato= e ?ordem=),
// para o link poder ser compartilhado. Hoje usa dados de exemplo; sem guard até a API.
export function CategoryListingsPage() {
  const { id } = useParams()
  const categoryId = parseCategoryId(id)
  const [params, setParams] = useSearchParams()
  const contact = parseContact(params.get('contato'))
  const sort = parseSort(params.get('ordem'))

  const category = useCategory(categoryId)
  const listings = useListings({ categoryId, contact, sort })
  useDocumentTitle(category.data?.name ?? 'Categoria')

  const sentinelRef = useRef<HTMLDivElement>(null)
  const pages = listings.data?.pages ?? []
  const items = pages.flatMap((page) => page.items)
  const total = pages[0]?.total ?? 0
  const canLoadMore =
    listings.hasNextPage && !listings.isFetchingNextPage && !listings.isFetchNextPageError
  useReachEnd(sentinelRef, () => void listings.fetchNextPage(), {
    enabled: canLoadMore,
    watch: items.length,
  })

  function updateParams(changes: { contato?: ContactMode | null; ordem?: ListingSort | null }) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if ('contato' in changes) {
          if (changes.contato) next.set('contato', changes.contato)
          else next.delete('contato')
        }
        if ('ordem' in changes) {
          const value = changes.ordem ? sortToParam(changes.ordem) : null
          if (value) next.set('ordem', value)
          else next.delete('ordem')
        }
        return next
      },
      { replace: true },
    )
  }

  const notFound = categoryId === null || (category.isSuccess && category.data === null)

  return (
    <section className="mx-auto flex max-w-[1440px] flex-col gap-7 px-4 pb-24 pt-8 sm:px-5 md:px-12 lg:px-[100px] lg:pt-12">
      <ArrowLink to={ROUTES.categories}>Categorias</ArrowLink>

      {notFound ? (
        <EmptyState
          title="Categoria não encontrada"
          action={<ButtonLink to={ROUTES.categories}>Todas as categorias</ButtonLink>}
        >
          Essa categoria não existe ou o endereço está incorreto.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-1.5">
              {category.data ? (
                <h1 className="font-display text-4xl font-bold text-navy lg:text-[40px]">
                  {category.data.name}
                </h1>
              ) : (
                <>
                  <h1 className="sr-only">Carregando categoria…</h1>
                  <Skeleton className="h-10 w-72 max-w-full" />
                </>
              )}
              {pages.length > 0 ? (
                <p className="text-base text-text-muted">{countLabel(total)} de alunos da Unifor</p>
              ) : (
                <Skeleton className="h-5 w-56 max-w-full" />
              )}
            </div>
            <ListingFilters
              contact={contact}
              sort={sort}
              onContactChange={(value) => updateParams({ contato: value ?? null })}
              onSortChange={(value) => updateParams({ ordem: value })}
            />
          </div>

          <p role="status" className="sr-only">
            {listings.isPending ? 'Carregando anúncios…' : `${items.length} de ${total} anúncios carregados`}
          </p>

          {listings.isError && items.length === 0 ? (
            <div role="alert">
              <EmptyState
                title="Não foi possível carregar os anúncios"
                action={<Button onClick={() => void listings.refetch()}>Tentar de novo</Button>}
              >
                Confira sua conexão e tente de novo.
              </EmptyState>
            </div>
          ) : listings.isPending ? (
            <ListingGrid listings={[]} skeletonCount={FIRST_LOAD_SKELETONS} />
          ) : items.length === 0 ? (
            <EmptyState
              title="Nenhum anúncio encontrado"
              action={
                contact ? (
                  <Button variant="secondary" onClick={() => updateParams({ contato: null, ordem: null })}>
                    Limpar filtros
                  </Button>
                ) : (
                  <ButtonLink to={ROUTES.categories}>Outras categorias</ButtonLink>
                )
              }
            >
              {contact
                ? 'Nenhum anúncio desta categoria tem essa forma de contato.'
                : 'Ainda não há anúncios nesta categoria.'}
            </EmptyState>
          ) : (
            <div
              className={`flex flex-col gap-8 transition-opacity duration-150 ${
                listings.isPlaceholderData ? 'opacity-60' : ''
              }`}
            >
              <ListingGrid
                listings={items}
                skeletonCount={listings.isFetchingNextPage ? NEXT_PAGE_SKELETONS : 0}
              />

              {listings.isFetchNextPageError ? (
                <div className="flex flex-col items-center gap-3">
                  <ErrorAlert title="Não foi possível carregar mais anúncios">
                    Os anúncios que já apareceram continuam aqui. Tente de novo.
                  </ErrorAlert>
                  <Button variant="secondary" onClick={() => void listings.fetchNextPage()}>
                    Tentar de novo
                  </Button>
                </div>
              ) : null}

              {/* Marcador que dispara a próxima página ao chegar perto da tela. */}
              <div ref={sentinelRef} aria-hidden="true" className="h-px" />

              {/* Só rolagem na tela. Este botão só aparece ao receber o foco pelo teclado: dá a
                  leitores de tela e a quem navega sem rolar um jeito de pedir a próxima página. */}
              {listings.hasNextPage && !listings.isFetchNextPageError ? (
                <button
                  type="button"
                  onClick={() => void listings.fetchNextPage()}
                  className="sr-only self-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-primary focus:not-sr-only focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Carregar mais anúncios
                </button>
              ) : null}

              {!listings.hasNextPage && !listings.isFetchNextPageError ? (
                <p className="text-center text-sm text-text-muted">Você viu todos os {total} anúncios.</p>
              ) : null}
            </div>
          )}
        </>
      )}
    </section>
  )
}
