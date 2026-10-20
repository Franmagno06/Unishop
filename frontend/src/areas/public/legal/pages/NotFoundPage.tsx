import { ButtonLink } from '../../../../shared/components/ui/Button'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'

export function NotFoundPage() {
  useDocumentTitle('Página não encontrada')

  return (
    <section className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-5 py-20">
      <h1 className="font-display text-4xl font-bold text-navy">Página não encontrada</h1>
      <p className="text-text-muted">O endereço que você abriu não existe ou foi movido.</p>
      <ButtonLink to={ROUTES.home}>Voltar para a tela inicial</ButtonLink>
    </section>
  )
}
