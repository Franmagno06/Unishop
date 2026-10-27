import { ButtonLink } from '../../../../shared/components/ui/Button'
import { CheckIcon } from '../../../../shared/components/ui/icons'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'

// RF004.7: confirmação final. Sem "Voltar": o caminho é "Entrar".
export function ResetSuccessPage() {
  useDocumentTitle('Senha redefinida')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex size-16 items-center justify-center rounded-full bg-whatsapp text-surface">
        <CheckIcon className="size-8" />
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold text-navy">Senha redefinida!</h1>
        <p className="text-[15px] text-text-muted">
          Sua senha foi alterada com sucesso. Use a nova senha para entrar no Unishop.
        </p>
      </div>
       <ButtonLink to={ROUTES.login} state={{ afterReset: true }} fullWidth>
        Entrar
      </ButtonLink>
    </div>
  )
}
