import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { SuccessAlert } from '../../../../shared/components/ui/Alert'
import { Button } from '../../../../shared/components/ui/Button'
import { EmptyState } from '../../../../shared/components/ui/EmptyState'
import { Pagination } from '../../../../shared/components/ui/Pagination'
import { useDebounce } from '../../../../shared/hooks/use-debounce'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { AdminPageHeading } from '../../shared/components/AdminPageHeading'
import { AdminSearch } from '../../shared/components/AdminSearch'
import { StatsCards } from '../../shared/components/StatsCards'
import { tableCard } from '../../shared/components/table-styles'
import { DeleteProductModal } from '../components/DeleteProductModal'
import { ProductsTable } from '../components/ProductsTable'
import { useAdminCategories, useProducts, useProductStats } from '../hooks/use-admin-products'
import type { AdminProduct } from '../types/product.types'
import { inputClasses } from '../../../../shared/components/ui/field-styles'
import { SEARCH_MAX_LENGTH } from '../../../../shared/constants/search'

const number = new Intl.NumberFormat('pt-BR')

// RF022 · RN-ADM-07 (Figma A03). Busca, categoria e página ficam na URL, como na lista de usuários.
// Dados de exemplo; sem API até o backend existir.
export function AdminProductsPage() {
  useDocumentTitle('Produtos · Admin')
  const [params, setParams] = useSearchParams()
  const urlSearch = (params.get('busca') ?? '').slice(0, SEARCH_MAX_LENGTH)
  const categoryParam = Number(params.get('categoria'))
  const categoryId = Number.isInteger(categoryParam) && categoryParam > 0 ? categoryParam : null
  const page = Math.max(1, Number(params.get('pagina')) || 1)

  const [searchText, setSearchText] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchText.trim(), 300)
  const [deleting, setDeleting] = useState<AdminProduct | null>(null)
  const [removedTitle, setRemovedTitle] = useState<string | null>(null)

  useEffect(() => {
    if (debouncedSearch === urlSearch) return
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (debouncedSearch) next.set('busca', debouncedSearch)
        else next.delete('busca')
        next.delete('pagina')
        return next
      },
      { replace: true },
    )
  }, [debouncedSearch, urlSearch, setParams])

  function update(changes: { categoria?: number | null; pagina?: number }) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (changes.categoria !== undefined) {
        if (changes.categoria === null) next.delete('categoria')
        else next.set('categoria', String(changes.categoria))
        next.delete('pagina')
      }
      if (changes.pagina !== undefined) {
        if (changes.pagina <= 1) next.delete('pagina')
        else next.set('pagina', String(changes.pagina))
      }
      return next
    })
  }

  const stats = useProductStats()
  const categories = useAdminCategories()
  const products = useProducts({ search: urlSearch, categoryId, page })
  const data = products.data

  return (
    <>
      <AdminPageHeading title="Produtos" subtitle="Todos os produtos anunciados na plataforma." />

      <StatsCards
        label="Indicadores de produtos"
        items={
          stats.data
            ? [
                { label: 'Produtos ativos', value: number.format(stats.data.active) },
                { label: 'Pausados', value: number.format(stats.data.paused) },
                { label: 'Vendidos no mês', value: number.format(stats.data.soldInMonth) },
              ]
            : undefined
        }
      />

      {removedTitle ? <SuccessAlert>{`O produto “${removedTitle}” foi excluído.`}</SuccessAlert> : null}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <AdminSearch
          label="Buscar produto ou vendedor"
          placeholder="Buscar produto ou vendedor…"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <div className="md:w-[240px]">
          <label htmlFor="categoria" className="sr-only">
            Filtrar por categoria
          </label>
          <select
            id="categoria"
            className={`${inputClasses()} cursor-pointer font-semibold text-navy`}
            value={categoryId ?? ''}
            onChange={(event) => update({ categoria: event.target.value ? Number(event.target.value) : null })}
          >
            <option value="">Todas as categorias</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p role="status" className="sr-only">
        {products.isPending ? 'Carregando produtos…' : data ? `${data.total} produtos encontrados` : ''}
      </p>

      {products.isError ? (
        <div role="alert">
          <EmptyState
            title="Não foi possível carregar os produtos"
            action={<Button onClick={() => void products.refetch()}>Tentar de novo</Button>}
          >
            Confira sua conexão e tente de novo.
          </EmptyState>
        </div>
      ) : data && data.total === 0 ? (
        <EmptyState title="Nenhum produto encontrado">
          Tente outro nome de produto ou de vendedor, ou mude a categoria.
        </EmptyState>
      ) : (
        <section aria-label="Lista de produtos" className={tableCard} aria-busy={products.isFetching}>
          <ProductsTable products={data?.items} onDelete={setDeleting} />
          <Pagination
            page={data?.page ?? page}
            totalPages={data?.totalPages ?? 1}
            onChange={(next) => update({ pagina: next })}
            summary={
              data
                ? `Mostrando ${data.items.length} de ${number.format(data.total)} produtos`
                : 'Carregando…'
            }
          />
        </section>
      )}

      {deleting ? (
        <DeleteProductModal
          product={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setRemovedTitle(deleting.title)
            setDeleting(null)
          }}
        />
      ) : null}
    </>
  )
}
