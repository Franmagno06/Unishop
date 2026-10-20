import { Link } from 'react-router'
import { ButtonLink } from '../../../shared/components/ui/Button'
import { Logo } from '../../../shared/components/ui/Logo'
import { ROUTES } from '../../../shared/constants/routes'

const SUPPORT_EMAIL = 'suporte@unishop.unifor.br'
// O número do suporte não está definido nos documentos: o botão só aparece se a variável existir.
const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined

const footerLink =
  'rounded text-sm text-text transition-colors duration-150 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-5 pb-8 pt-14 md:px-12 lg:px-[100px]">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          <div className="flex flex-1 flex-col items-start gap-3.5">
            <Logo />
            <p className="max-w-sm text-sm text-text-muted">
              O marketplace dos alunos da Unifor. Compre e venda com quem estuda com você.
            </p>
          </div>

          <nav aria-label="Rodapé" className="flex w-[220px] flex-col items-start gap-3">
            <p className="text-[15px] font-semibold text-navy">Navegação</p>
            <a href="/#como-funciona" className={footerLink}>
              Como funciona
            </a>
            <Link to={ROUTES.categories} className={footerLink}>
              Categorias
            </Link>
            <a href="/#duvidas" className={footerLink}>
              Dúvidas frequentes
            </a>
            <Link to={ROUTES.register} className={footerLink}>
              Criar conta
            </Link>
          </nav>

          <section
            aria-labelledby="suporte-titulo"
            className="flex w-full flex-col gap-3 rounded-[14px] bg-primary-soft p-6 lg:w-[380px]"
          >
            <h2 id="suporte-titulo" className="font-display text-[22px] font-bold text-navy">
              Precisa de ajuda?
            </h2>
            <p className="text-sm text-text-muted">
              Nossa equipe de suporte responde dúvidas, denúncias de anúncios e problemas com
              pedidos.
            </p>
            <div>
              <p className="text-xs font-semibold text-text-muted">E-MAIL</p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-[15px] font-semibold text-navy hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted">ATENDIMENTO</p>
              <p className="text-[15px] font-semibold text-navy">Segunda a sexta, das 8h às 18h</p>
            </div>
            {SUPPORT_WHATSAPP ? (
              <ButtonLink
                to={`https://wa.me/${SUPPORT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="whatsapp"
                fullWidth
              >
                Falar com o suporte no WhatsApp
              </ButtonLink>
            ) : null}
          </section>
        </div>

        <hr className="border-border" />

        <div className="flex flex-col gap-2 text-[13px] text-text-muted sm:flex-row sm:justify-between">
          <p>© 2026 Unishop · Projeto acadêmico — Sistema de e-commerce Unifor</p>
          <p>
            <Link to={ROUTES.terms} className="hover:underline">
              Termos de uso
            </Link>
            {' · '}
            <Link to={ROUTES.privacy} className="hover:underline">
              Política de privacidade
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
