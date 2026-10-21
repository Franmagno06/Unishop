import { InfoAlert } from '../../../../shared/components/ui/Alert'
import { ButtonLink } from '../../../../shared/components/ui/Button'
import { ROUTES } from '../../../../shared/constants/routes'
import { DEMO_EXPIRED_TOKEN, DEMO_INVALID_TOKEN, demoResetToken } from '../services/demo-reset-token'
import { MOCK_MODE } from '../services/mock-mode'

const smallLink =
  'rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

// No modo de demonstração não existe e-mail de verdade: estes links fazem o papel do link do
// e-mail. Só aparece em desenvolvimento com VITE_USE_MOCKS=true (sai do build de produção).
export function DemoResetLinks({ email }: { email: string }) {
  if (!MOCK_MODE) return null

  return (
    <div className="flex flex-col gap-4">
      <InfoAlert title="Modo de demonstração (sem servidor)">
        Nenhum e-mail foi enviado de verdade. Use os botões abaixo no lugar do link do e-mail.
      </InfoAlert>
      <ButtonLink to={`${ROUTES.resetPassword}/${demoResetToken(email)}`} fullWidth>
        Abrir link do e-mail (simulação)
      </ButtonLink>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        <a href={`${ROUTES.resetPassword}/${DEMO_EXPIRED_TOKEN}`} className={smallLink}>
          Simular link expirado
        </a>
        <a href={`${ROUTES.resetPassword}/${DEMO_INVALID_TOKEN}`} className={smallLink}>
          Simular link inválido
        </a>
      </p>
    </div>
  )
}
