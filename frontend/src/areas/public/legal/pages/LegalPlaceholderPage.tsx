import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'

// Os textos de Termos e Privacidade ainda não existem (pendência: Francisco escreve a versão
// mínima no MVP). Não inventar conteúdo jurídico aqui.
function LegalPlaceholder({ title }: { title: string }) {
  useDocumentTitle(title)

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-20">
      <h1 className="font-display text-4xl font-bold text-navy">{title}</h1>
      <p className="text-text-muted">Este texto está em elaboração pela equipe do Unishop.</p>
    </section>
  )
}

export function TermsPage() {
  return <LegalPlaceholder title="Termos de uso" />
}

export function PrivacyPage() {
  return <LegalPlaceholder title="Política de privacidade" />
}
