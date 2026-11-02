import { useEffect, useRef, useState } from 'react'
import googleIcon from '../../../../assets/google.svg'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Button } from '../../../../shared/components/ui/Button'
import { useGoogleLogin } from '../hooks/use-google-login'
import { MOCK_MODE } from '../services/mock-mode'
import { authErrorContent } from '../utils/error-messages'
import { loadGoogleIdentity } from '../utils/google-identity'

function UnavailableButton({ title }: { title: string }) {
  return (
    <Button variant="social" fullWidth disabled title={title}>
      <img src={googleIcon} alt="" width={20} height={20} />
      Continuar com Google
    </Button>
  )
}

// RN-ACE-14: o Google só entrega o ID token pelo botão que ele mesmo desenha (Google Identity
// Services), por isso o botão do Figma dá lugar ao oficial. Sem Client ID, ou em demonstração, fica
// o botão desabilitado.
export function GoogleButton() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (!clientId) return <UnavailableButton title="Login com Google indisponível neste ambiente." />
  if (import.meta.env.DEV && MOCK_MODE) {
    return <UnavailableButton title="Login com Google indisponível no modo de demonstração." />
  }
  return <GoogleSignIn clientId={clientId} />
}

function GoogleSignIn({ clientId }: { clientId: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [unavailable, setUnavailable] = useState(false)
  const { mutate, isError, error, isPending } = useGoogleLogin()

  useEffect(() => {
    let cancelled = false
    loadGoogleIdentity()
      .then((google) => {
        const element = container.current
        if (cancelled || !element) return
        google.initialize({ client_id: clientId, callback: ({ credential }) => mutate(credential) })
        google.renderButton(element, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(400, element.clientWidth || 320),
          locale: 'pt-BR',
        })
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true)
      })
    return () => {
      cancelled = true
    }
  }, [clientId, mutate])

  if (unavailable) {
    return <UnavailableButton title="O login com Google está indisponível no momento." />
  }

  const content = isError ? authErrorContent(error, 'google') : null
  return (
    <div className="flex flex-col gap-3">
      <div ref={container} aria-busy={isPending} className="flex min-h-11 justify-center" />
      {content ? <ErrorAlert title={content.title}>{content.message}</ErrorAlert> : null}
    </div>
  )
}
