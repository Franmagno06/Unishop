import googleIcon from '../../../../assets/google.svg'
import { Button } from '../../../../shared/components/ui/Button'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

// O fluxo real (Google Identity Services → POST /auth/google) ainda não está integrado.
// Sem VITE_GOOGLE_CLIENT_ID o botão fica desabilitado.
export function GoogleButton() {
  return (
    <Button
      variant="social"
      fullWidth
      disabled={!GOOGLE_CLIENT_ID}
      title={GOOGLE_CLIENT_ID ? undefined : 'Login com Google indisponível neste ambiente.'}
    >
      <img src={googleIcon} alt="" width={20} height={20} />
      Continuar com Google
    </Button>
  )
}
