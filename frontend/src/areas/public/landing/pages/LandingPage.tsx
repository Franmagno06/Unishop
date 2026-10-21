import { ButtonLink } from '../../../../shared/components/ui/Button'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { useSession } from '../../../../shared/hooks/use-session'
import { FaqAccordion } from '../components/FaqAccordion'
import { RecentListingsCarousel } from '../components/RecentListingsCarousel'

const steps = [
  {
    title: 'Cadastre-se com seu e-mail Unifor',
    text: 'Só alunos com e-mail institucional entram na plataforma.',
  },
  {
    title: 'Anuncie ou busque por categoria',
    text: 'Publique um item em minutos ou navegue pelas categorias.',
  },
  {
    title: 'Combine pelo WhatsApp ou no campus',
    text: 'O vendedor informa o contato ou o bloco e horário em que está.',
  },
]

const securityItems = [
  { title: 'Só alunos verificados', text: 'Cadastro exige e-mail @edu.unifor.br.' },
  {
    title: 'Contato do seu jeito',
    text: 'Todo anúncio tem o WhatsApp do vendedor para combinar os detalhes.',
  },
  {
    title: 'Retirada no campus',
    text: 'Encontros dentro da universidade, em locais conhecidos.',
  },
]

const sectionX = 'px-5 md:px-12 lg:px-[100px]'

// RF001 · tela inicial pública: hero, carrossel, como funciona, dúvidas, segurança (frontend.md §7).
export function LandingPage() {
  useDocumentTitle('Unishop')
  const { isLoggedIn } = useSession()

  return (
    <>
      <section className={`mx-auto max-w-[1440px] ${sectionX} pb-16 pt-12 lg:pb-[88px] lg:pt-24`}>
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <div className="flex flex-1 flex-col items-start gap-6">
            <p className="rounded-full bg-primary-soft px-3.5 py-1.5 text-[13px] font-semibold text-navy">
              EXCLUSIVO PARA ALUNOS UNIFOR
            </p>
            <h1 className="max-w-[560px] font-display text-4xl font-bold text-navy sm:text-5xl lg:text-[52px] lg:leading-[1.15]">
              O comércio da Unifor, reunido em um só lugar.
            </h1>
            <p className="max-w-[520px] text-lg text-text">
              Compre e venda livros, eletrônicos, alimentos e materiais direto com colegas de campus
              — sem depender de grupos dispersos que hoje alcançam menos de 5% dos alunos.
            </p>
            {isLoggedIn ? (
              <ButtonLink to={ROUTES.categories}>Ver categorias</ButtonLink>
            ) : (
              <ButtonLink to={ROUTES.register}>Criar minha conta com e-mail Unifor</ButtonLink>
            )}
          </div>

          <div className="w-full min-w-0 max-w-[608px] rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:w-[608px] lg:shrink-0">
            <RecentListingsCarousel />
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-surface">
        <div className={`mx-auto flex max-w-[1440px] flex-col gap-12 ${sectionX} py-16 lg:py-20`}>
          <h2 className="font-display text-[34px] font-bold text-navy">Como funciona</h2>
          <ol className="flex flex-col gap-10 md:flex-row">
            {steps.map((step, index) => (
              <li key={step.title} className="flex flex-1 flex-col gap-3">
                <span className="font-display text-[40px] font-semibold text-border" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-[19px] font-semibold text-navy">{step.title}</h3>
                <p className="text-[15px] text-text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="duvidas">
        <div
          className={`mx-auto flex max-w-[1440px] flex-col items-center gap-10 ${sectionX} py-16 lg:py-20`}
        >
          <div className="flex flex-col items-center gap-2.5 text-center">
            <h2 className="font-display text-[34px] font-bold text-navy">Dúvidas frequentes</h2>
            <p className="text-base text-text-muted">
              Tudo o que você precisa saber antes de comprar ou vender no Unishop.
            </p>
          </div>
          <FaqAccordion />
          <a
            href="/#suporte-titulo"
            className="rounded text-[15px] font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Não encontrou sua dúvida? Fale com o suporte
          </a>
        </div>
      </section>

      <section id="seguranca" className="bg-navy">
        <div
          className={`mx-auto flex max-w-[1440px] flex-col gap-10 ${sectionX} py-16 lg:flex-row lg:gap-16 lg:py-20`}
        >
          <div className="flex flex-col gap-4 lg:w-[420px] lg:shrink-0">
            <h2 className="font-display text-[32px] font-bold text-surface">
              Feito para gerar confiança entre alunos
            </h2>
            <p className="text-base text-on-navy-muted">
              Só entra quem tem e-mail institucional — e cada anúncio mostra quem vendeu e como
              encontrá-lo.
            </p>
          </div>
          <ul className="flex flex-1 flex-col gap-[22px]">
            {securityItems.map((item) => (
              <li key={item.title} className="flex flex-col gap-1">
                <h3 className="text-[17px] font-semibold text-surface">{item.title}</h3>
                <p className="text-[15px] text-on-navy-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
