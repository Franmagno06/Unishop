import { Link } from 'react-router'
import { ButtonLink } from '../../../shared/components/ui/Button'
import { Logo } from '../../../shared/components/ui/Logo'
import { ROUTES } from '../../../shared/constants/routes'

const navLink =
  'rounded text-[15px] font-medium text-text transition-colors duration-150 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary'

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 px-4 py-4 sm:gap-4 sm:px-5 md:px-12 lg:px-[100px]">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-9 md:flex">
          <Link to={ROUTES.home} className={navLink}>
            Início
          </Link>
          <Link to={ROUTES.categories} className={navLink}>
            Categorias
          </Link>
          <a href="/#seguranca" className={navLink}>
            Segurança
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <ButtonLink to={ROUTES.login} variant="secondary" className="whitespace-nowrap px-3 text-sm sm:px-[22px] sm:text-[15px]">
            Entrar
          </ButtonLink>
          <ButtonLink to={ROUTES.register} className="whitespace-nowrap px-3 text-sm sm:px-[22px] sm:text-[15px]">
            Criar conta
          </ButtonLink>
        </div>
      </div>
    </header>
  )
}
