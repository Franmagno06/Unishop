import { useSearchParams } from 'react-router'
import { Button } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { SEARCH_MAX_LENGTH } from '../../../../shared/constants/search'
import { useDebounce } from '../../../../shared/hooks/use-debounce'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { CategoryCard } from '../components/CategoryCard'
import { CategorySearch } from '../components/CategorySearch'
import { useCategories } from '../hooks/use-categories'

const SKELETON_COUNT = 6

function resultsMessage(count: number): string {
  return `${count} ${count === 1 ? 'categoria encontrada' : 'categorias encontradas'}`
}

// Categorias · RF006, RN-CAT-01 a 04. Hoje a rota fica aberta e usa dados de exemplo; o guard de
// login (RN-CAT-04) e a API entram depois das telas (combinado em 20/10/2026).
// A busca fica na URL (?q=), para poder compartilhar o link e voltar com o navegador.
export function CategoriesPage() {
  useDocumentTitle('Categorias')

  const [params, setParams] = useSearchParams()
  const search = (params.get('q') ?? '').slice(0, SEARCH_MAX_LENGTH)
  const debouncedSearch = useDebounce(search, 300)
  const { data: categories, isPending, isError, refetch } = useCategories(debouncedSearch)

  function updateSearch(value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set('q', value)
        else next.delete('q')
        return next
      },
      { replace: true },
    )
  }

  return (
    <section className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pb-24 pt-10 sm:px-5 md:px-12 lg:px-[100px] lg:pt-14">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-bold text-navy lg:text-[40px]">Categorias</h1>
          <p className="text-base text-text-muted">
            Escolha uma categoria para ver os itens anunciados pelos alunos.
          </p>
        </div>
        <CategorySearch value={search} onChange={(event) => updateSearch(event.target.value)} />
      </div>

      <p role="status" className="sr-only">
        {isPending ? 'Carregando categorias…' : categories ? resultsMessage(categories.length) : ''}
      </p>

      {isError ? (
        <div role="alert">
          <EmptyState
            title="Não foi possível carregar as categorias"
            action={<Button onClick={() => refetch()}>Tentar de novo</Button>}
          >
            Confira sua conexão e tente de novo.
          </EmptyState>
        </div>
      ) : isPending ? (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <li key={index}>
              <Card className="flex flex-col gap-3.5 p-5">
                <Skeleton className="h-35 rounded-[10px]" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </Card>
            </li>
          ))}
        </ul>
      ) : categories.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria encontrada"
          action={
            <Button variant="secondary" onClick={() => updateSearch('')}>
              Limpar busca
            </Button>
          }
        >
          {`Não encontramos nada para “${search.trim()}”. Tente outro termo.`}
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryCard category={category} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
