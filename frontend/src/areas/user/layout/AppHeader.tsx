import { NavLink } from 'react-router'
import { ButtonLink } from '../../../shared/components/ui/Button'
import { Logo } from '../../../shared/components/ui/Logo'
import { ROUTES } from '../../../shared/constants/routes'

// Iniciais provisórias: o nome do aluno só existe com a API (decisão de 21/10/2026).
const PROFILE_INITIALS = 'PF'

const navLink =
  'whitespace-nowrap rounded text-[15px] font-medium text-text transition-colors duration-150 hover:text-primary aria-[current=page]:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary'

function Navigation({ className }: { className: string }) {
  return (
    <nav aria-label="Principal" className={className}>
      <NavLink to={ROUTES.home} end className={navLink}>
        Início
      </NavLink>
      <NavLink to={ROUTES.categories} className={navLink}>
        Categorias
      </NavLink>
      <NavLink to={ROUTES.profile} className={navLink}>
        Meus anúncios
      </NavLink>
    </nav>
  )
}

// Cabeçalho do aluno logado (Figma 04). Abaixo de md o Figma não define a navegação:
// os links vão para uma linha com rolagem horizontal (padrão provisório, ver roteiro-telas.md §4).
export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-5 md:px-12 lg:px-[100px]">
        <Logo />
        <Navigation className="hidden items-center gap-9 md:flex" />
        <div className="flex items-center gap-3 sm:gap-4">
          <ButtonLink
            to={ROUTES.createListing}
            className="whitespace-nowrap px-3 text-sm sm:px-[22px] sm:text-[15px]"
          >
            + Anunciar item
          </ButtonLink>
          <NavLink
            to={ROUTES.profile}
            aria-label="Meu perfil"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[15px] font-bold text-navy transition-[transform,background-color] duration-150 ease-out-strong hover:bg-primary-soft/70 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {PROFILE_INITIALS}
          </NavLink>
        </div>
      </div>
      <Navigation className="flex gap-6 overflow-x-auto border-t border-border px-4 py-3 scrollbar-none sm:px-5 md:hidden" />
    </header>
  )
}
