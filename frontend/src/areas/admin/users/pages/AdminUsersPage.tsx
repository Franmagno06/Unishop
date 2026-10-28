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
import { DeleteUserModal } from '../components/DeleteUserModal'
import { SEARCH_MAX_LENGTH } from '../../../../shared/constants/search'
import { SupportRequestsSection } from '../components/SupportRequestsSection'
import { UsersTable } from '../components/UsersTable'
import { useUsers, useUserStats } from '../hooks/use-admin-users'
import type { AdminUserRow, UserPresenceFilter } from '../types/user.types'

const FILTERS: { value: UserPresenceFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'online', label: 'Logados agora' },
  { value: 'offline', label: 'Offline' },
]
// Na URL o filtro vai em português, como as outras rotas: /admin/usuarios?status=logados
const PARAM_BY_FILTER: Record<UserPresenceFilter, string> = { all: '', online: 'logados', offline: 'offline' }
const FILTER_BY_PARAM: Record<string, UserPresenceFilter> = { logados: 'online', offline: 'offline' }

const number = new Intl.NumberFormat('pt-BR')

// RF019 · RN-ADM-02 e 03 (Figma A01). Busca, filtro e página ficam na URL: o "voltar" do navegador
// e o link copiado reabrem a mesma lista. Dados de exemplo; sem API até o backend existir.
export function AdminUsersPage() {
  useDocumentTitle('Usuários · Admin')
  const [params, setParams] = useSearchParams()
  const presence = FILTER_BY_PARAM[params.get('status') ?? ''] ?? 'all'
  const page = Math.max(1, Number(params.get('pagina')) || 1)
  const urlSearch = (params.get('busca') ?? '').slice(0, SEARCH_MAX_LENGTH)

  const [searchText, setSearchText] = useState(urlSearch)
  const debouncedSearch = useDebounce(searchText.trim(), 300)
  const [deleting, setDeleting] = useState<AdminUserRow | null>(null)
  const [removedName, setRemovedName] = useState<string | null>(null)

  // A digitação (depois da pausa) vai para a URL e volta à página 1.
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

  function update(changes: { status?: UserPresenceFilter; pagina?: number }) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (changes.status !== undefined) {
        if (changes.status === 'all') next.delete('status')
        else next.set('status', PARAM_BY_FILTER[changes.status])
        next.delete('pagina')
      }
      if (changes.pagina !== undefined) {
        if (changes.pagina <= 1) next.delete('pagina')
        else next.set('pagina', String(changes.pagina))
      }
      return next
    })
  }

  const stats = useUserStats()
  const users = useUsers({ search: urlSearch, presence, page })
  const data = users.data

  return (
    <>
      <AdminPageHeading title="Usuários" subtitle="Gerencie os alunos cadastrados no Unishop." />

      <StatsCards
        label="Indicadores de usuários"
        items={
          stats.data
            ? [
                { label: 'Usuários cadastrados', value: number.format(stats.data.total) },
                { label: 'Logados agora', value: number.format(stats.data.online), live: true },
                { label: 'Novos nesta semana', value: number.format(stats.data.newThisWeek) },
              ]
            : undefined
        }
      />

      {removedName ? (
        <SuccessAlert>{`A conta de ${removedName} foi excluída (anonimizada).`}</SuccessAlert>
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <AdminSearch
          label="Buscar por nome ou e-mail"
          placeholder="Buscar por nome ou e-mail…"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={presence === filter.value}
              onClick={() => update({ status: filter.value })}
              className="cursor-pointer rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-navy transition-colors duration-150 hover:border-navy/40 aria-pressed:border-navy aria-pressed:bg-navy aria-pressed:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <p role="status" className="sr-only">
        {users.isPending ? 'Carregando usuários…' : data ? `${data.total} usuários encontrados` : ''}
      </p>

      {users.isError ? (
        <div role="alert">
          <EmptyState
            title="Não foi possível carregar os usuários"
            action={<Button onClick={() => void users.refetch()}>Tentar de novo</Button>}
          >
            Confira sua conexão e tente de novo.
          </EmptyState>
        </div>
      ) : data && data.total === 0 ? (
        <EmptyState title="Nenhum usuário encontrado">
          Tente outro nome ou e-mail, ou mude o filtro de status.
        </EmptyState>
      ) : (
        <section aria-label="Lista de usuários" className={tableCard} aria-busy={users.isFetching}>
          <UsersTable users={data?.items} onDelete={setDeleting} />
          <Pagination
            page={data?.page ?? page}
            totalPages={data?.totalPages ?? 1}
            onChange={(next) => update({ pagina: next })}
            summary={
              data
                ? `Mostrando ${data.items.length} de ${number.format(data.total)} usuários`
                : 'Carregando…'
            }
          />
        </section>
      )}

      <SupportRequestsSection />

      {deleting ? (
        <DeleteUserModal
          user={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setRemovedName(deleting.name)
            setDeleting(null)
          }}
        />
      ) : null}
    </>
  )
}
