import { Link } from 'react-router'
import logo from '../../../assets/logo.png'
import { ROUTES } from '../../constants/routes'

export function LogoIcon({ className = 'size-12' }: { className?: string }) {
  return <img src={logo} alt="" width={716} height={723} className={`${className} object-contain`} />
}

export function Logo() {
  return (
    <Link to={ROUTES.home} className="flex items-center gap-2.5" aria-label="Unishop, página inicial">
      <LogoIcon />
      <span translate="no" className="hidden font-display text-xl min-[440px]:inline font-bold text-navy sm:text-[26px]">
        Unishop
      </span>
    </Link>
  )
}
