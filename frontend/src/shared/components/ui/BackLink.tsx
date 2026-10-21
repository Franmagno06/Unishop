import type { MouseEvent, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowLeftIcon } from './icons'

type BackLinkProps = {
  // Para onde ir quando não há tela anterior do próprio site (link direto, F5, abertura pelo e-mail).
  fallbackTo: string
  children?: ReactNode
}

// "← Voltar": leva à tela de onde a pessoa veio; se ela abriu esta tela direto, vai ao destino
// padrão. É um link de verdade (clique com Ctrl abre em outra aba) e só usa o histórico quando
// a tela anterior é deste site: no React Router a primeira tela da sessão tem a chave "default".
export function BackLink({ fallbackTo, children = 'Voltar' }: BackLinkProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const hasPreviousScreen = location.key !== 'default'

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const plainLeftClick =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    if (hasPreviousScreen && plainLeftClick) {
      event.preventDefault()
      navigate(-1)
    }
  }

  return (
    <Link
      to={fallbackTo}
      onClick={handleClick}
      className="group inline-flex items-center gap-1.5 self-start rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ArrowLeftIcon className="size-4 transition-transform duration-150 ease-out-strong group-hover:-translate-x-0.5 motion-reduce:transition-none" />
      {children}
    </Link>
  )
}
