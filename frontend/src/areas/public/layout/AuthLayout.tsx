import { Outlet } from 'react-router'
import logo from '../../../assets/logo.png'

// Tela dividida do Figma: painel da marca (620px) + área do formulário.
export function AuthLayout() {
  return (
    <div className="relative flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:text-navy focus:shadow"
      >
        Ir para o conteúdo
      </a>
      <aside className="flex items-center gap-5 bg-navy px-6 py-6 lg:w-[620px] lg:shrink-0 lg:flex-col lg:items-start lg:justify-center lg:gap-7 lg:px-20">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-surface lg:size-[168px] lg:rounded-[32px]">
          <img src={logo} alt="" className="size-11 object-contain lg:size-[120px]" />
        </div>
        <div className="flex flex-col gap-1 lg:gap-7">
          <p translate="no" className="font-display text-3xl font-bold text-surface lg:text-5xl">
            Unishop
          </p>
          <p className="hidden text-xl text-on-navy-muted lg:block">
            Compre e venda com quem estuda com você.
          </p>
        </div>
      </aside>
      <main id="conteudo" tabIndex={-1} className="flex flex-1 focus:outline-none items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
