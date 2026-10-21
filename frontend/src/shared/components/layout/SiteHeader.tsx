import { NavLink } from 'react-router'
import { ROUTES } from '../../constants/routes'
import { useSession } from '../../hooks/use-session'
import { ButtonLink } from '../ui/Button'
import { Logo } from '../ui/Logo'
import { ProfileMenu } from './ProfileMenu'

const navLink =
  'whitespace-nowrap rounded text-[15px] font-medium text-text transition-colors duration-150 hover:text-primary aria-[current=page]:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary'

function Navigation({ className, links }: { className: string; links: NavItem[] }) {
  return (
    <nav aria-label="Principal" className={className}>
      {links.map((link) =>
        link.anchor ? (
          <a key={link.label} href={link.to} className={navLink}>
            {link.label}
          </a>
        ) : (
          <NavLink key={link.label} to={link.to} end={link.to === ROUTES.home} className={navLink}>
            {link.label}
          </NavLink>
        ),
      )}
    </nav>
  )
}

type NavItem = { label: string; to: string; anchor?: boolean }

const visitorLinks: NavItem[] = [
  { label: 'Início', to: ROUTES.home },
  { label: 'Categorias', to: ROUTES.categories },
  { label: 'Segurança', to: '/#seguranca', anchor: true },
]
const studentLinks: NavItem[] = [
  { label: 'Início', to: ROUTES.home },
  { label: 'Categorias', to: ROUTES.categories },
  { label: 'Meus anúncios', to: ROUTES.profile },
]
// O administrador não anuncia nem tem "Meus anúncios" (regra central do projeto).
const adminLinks: NavItem[] = [
  { label: 'Início', to: ROUTES.home },
  { label: 'Categorias', to: ROUTES.categories },
]

const actionButton = 'whitespace-nowrap px-3 text-sm sm:px-[22px] sm:text-[15px]'

// Cabeçalho único do site: muda sozinho conforme a sessão (visitante, aluno ou admin), em qualquer
// tela. Abaixo de md o Figma não define a navegação: os links vão para uma linha com rolagem
// horizontal (padrão provisório, ver roteiro-telas.md §4).
export function SiteHeader() {
  const { isLoggedIn, role } = useSession()
  const links = !isLoggedIn ? visitorLinks : role === 'admin' ? adminLinks : studentLinks

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-5 md:px-12 lg:px-[100px]">
        <Logo />
        <Navigation className="hidden items-center gap-9 md:flex" links={links} />
        <div className="flex items-center gap-2 sm:gap-4">
          {!isLoggedIn ? (
            <>
              <ButtonLink to={ROUTES.login} variant="secondary" className={actionButton}>
                Entrar
              </ButtonLink>
              <ButtonLink to={ROUTES.register} className={actionButton}>
                Criar conta
              </ButtonLink>
            </>
          ) : (
            <>
              {role !== 'admin' ? (
                <ButtonLink to={ROUTES.createListing} className={actionButton}>
                  + Anunciar item
                </ButtonLink>
              ) : null}
              <ProfileMenu role={role ?? 'student'} />
            </>
          )}
        </div>
      </div>
      <Navigation
        className="flex gap-6 overflow-x-auto border-t border-border px-4 py-3 scrollbar-none sm:px-5 md:hidden"
        links={links}
      />
    </header>
  )
}
