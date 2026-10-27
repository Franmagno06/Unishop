import { Link } from 'react-router'
import { Avatar } from '../../../../shared/components/ui/Avatar'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Skeleton } from '../../../../shared/components/ui/Skeleton'
import { adminPaths } from '../../../../shared/constants/routes'
import { formatDate } from '../../../../shared/utils/format-date'
import { rowDanger, rowLink, tableCell, tableHead, tableRow } from '../../shared/components/table-styles'
import { formatLastSeen } from '../../shared/utils/last-access'
import type { AdminUser, AdminUserRow } from '../types/user.types'

// Coluna "Status" (Figma A01): "Logado agora" em verde, ou o tempo desde o último acesso em cinza.
// Conta suspensa pelo admin mostra o selo próprio (RN-ADM-05).
export function UserPresence({
  user,
}: {
  user: Pick<AdminUser, 'status' | 'isOnline' | 'lastAccessAt'>
}) {
  if (user.status === 'suspended') return <Badge tone="danger">Conta suspensa</Badge>
  const dot = user.isOnline ? 'bg-whatsapp' : 'bg-border'
  return (
    <span
      className={`inline-flex items-center gap-2 ${user.isOnline ? 'font-semibold text-whatsapp' : 'text-text-muted'}`}
    >
      <span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />
      {user.isOnline ? 'Logado agora' : formatLastSeen(user.lastAccessAt)}
    </span>
  )
}

type UsersTableProps = {
  // undefined = carregando (esqueleto das linhas)
  users: AdminUserRow[] | undefined
  onDelete: (user: AdminUserRow) => void
}

// Tabela de usuários (Figma A01). "Ver" abre os detalhes; "Excluir" abre o pop-up de confirmação.
export function UsersTable({ users, onDelete }: UsersTableProps) {
  return (
    <div className="overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[820px] border-collapse">
        <caption className="sr-only">Usuários cadastrados</caption>
        <thead>
          <tr>
            <th scope="col" className={tableHead}>Usuário</th>
            <th scope="col" className={tableHead}>E-mail</th>
            <th scope="col" className={tableHead}>Status</th>
            <th scope="col" className={tableHead}>Anúncios</th>
            <th scope="col" className={tableHead}>Cadastro</th>
            <th scope="col" className={tableHead}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {users
            ? users.map((user) => (
                <tr key={user.id} className={tableRow}>
                  <td className={tableCell}>
                    {/* Foto e nome abrem o perfil do usuário (detalhes). */}
                    <Link
                      to={adminPaths.userDetail(user.id)}
                      aria-label={`Abrir perfil de ${user.name}`}
                      className="group flex items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <Avatar name={user.name} imageUrl={user.avatarUrl} />
                      <span className="flex min-w-0 flex-col leading-snug">
                        <span className="truncate font-semibold text-text group-hover:text-primary group-hover:underline">
                          {user.name}
                        </span>
                        <span className="truncate text-xs text-text-muted">{user.course || 'Curso não informado'}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={tableCell}>{user.email}</td>
                  <td className={tableCell}>
                    <UserPresence user={user} />
                  </td>
                  <td className={tableCell}>{user.listingsCount}</td>
                  <td className={`${tableCell} whitespace-nowrap`}>{formatDate(user.createdAt)}</td>
                  <td className={tableCell}>
                    <div className="flex items-center gap-4">
                      <Link
                        to={adminPaths.userDetail(user.id)}
                        aria-label={`Ver ${user.name}`}
                        className={rowLink}
                      >
                        Ver
                      </Link>
                      <button
                        type="button"
                        aria-label={`Excluir ${user.name}`}
                        onClick={() => onDelete(user)}
                        className={rowDanger}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            : Array.from({ length: 7 }, (_, index) => (
                <tr key={index} className={tableRow} aria-hidden="true">
                  <td className={tableCell} colSpan={6}>
                    <Skeleton className="h-10" />
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
