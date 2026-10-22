import type { MouseEvent, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ArrowLink } from './ArrowLink'

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
  // Depois de redefinir a senha, o login não deve voltar para dentro do fluxo de recuperação.
  const afterReset = (location.state as { afterReset?: boolean } | null)?.afterReset === true
  const hasPreviousScreen = location.key !== 'default' && !afterReset

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const plainLeftClick =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    if (hasPreviousScreen && plainLeftClick) {
      event.preventDefault()
      navigate(-1)
    }
  }

  return (
    <ArrowLink to={fallbackTo} onClick={handleClick}>
      {children}
    </ArrowLink>
  )
}
