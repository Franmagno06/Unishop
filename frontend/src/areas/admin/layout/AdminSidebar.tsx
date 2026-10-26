import { NavLink, Link } from 'react-router'
import { BoxIcon, LogoutIcon, UsersIcon } from '../../../shared/components/ui/icons'
import { LogoIcon } from '../../../shared/components/ui/Logo'
import { ROUTES } from '../../../shared/constants/routes'
import { useLogout } from '../../../shared/hooks/use-logout'
import { ADMIN_PROFILE } from '../shared/services/admin-profile'

const navLink =
  'flex items-center gap-3 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-[15px] font-medium text-on-navy-muted transition-colors duration-150 hover:bg-white/10 hover:text-surface aria-[current=page]:bg-primary aria-[current=page]:font-semibold aria-[current=page]:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface'

const logoutButton =
  'inline-flex cursor-pointer items-center gap-2 rounded text-sm font-semibold text-on-navy-muted transition-colors duration-150 hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-surface'

// Menu lateral do painel (Figma A01 a A05): marca, Usuários, Produtos e, embaixo, quem está logado
// e "Sair". Abaixo de lg vira uma barra no topo (o Figma só desenha a tela larga).
export function AdminSidebar() {
  const logout = useLogout()

  return (
    <aside className="bg-navy text-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:px-5 lg:py-7">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 lg:px-0 lg:pt-0">
        <Link
          to={ROUTES.adminUsers}
          aria-label="Unishop, painel admin"
          className="flex items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-surface"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface">
            <LogoIcon className="size-8" />
          </span>
          <span className="flex flex-col leading-tight">
            <span translate="no" className="font-display text-xl font-bold">
              Unishop
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-on-navy-muted">
              Painel admin
            </span>
          </span>
        </Link>
        <button type="button" onClick={logout} className={`${logoutButton} lg:hidden`}>
          <LogoutIcon className="size-4" />
          Sair
        </button>
      </div>

      <nav aria-label="Painel admin" className="flex gap-2 px-4 py-3 lg:mt-9 lg:flex-col lg:px-0 lg:py-0">
        <NavLink to={ROUTES.adminUsers} className={navLink}>
          <UsersIcon className="size-5" />
          Usuários
        </NavLink>
        <NavLink to={ROUTES.adminProducts} className={navLink}>
          <BoxIcon className="size-5" />
          Produtos
        </NavLink>
      </nav>

      <div className="mt-auto hidden flex-col gap-5 lg:flex">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold"
          >
            {ADMIN_PROFILE.initials}
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">{ADMIN_PROFILE.name}</span>
            {ADMIN_PROFILE.email ? (
              <span className="truncate text-xs text-on-navy-muted">{ADMIN_PROFILE.email}</span>
            ) : null}
          </div>
        </div>
        <button type="button" onClick={logout} className={`${logoutButton} self-start`}>
          <LogoutIcon className="size-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
