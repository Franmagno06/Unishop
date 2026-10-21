import { Outlet } from 'react-router'
import { AppHeader } from './AppHeader'

// Layout do aluno logado (frontend.md §9). O rodapé traz o aviso de demonstração (RN-PAG-15).
export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:text-navy focus:shadow"
      >
        Ir para o conteúdo
      </a>
      <AppHeader />
      <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-surface px-4 py-5 text-center text-[13px] text-text-muted sm:px-5">
        Ambiente de demonstração: nenhum valor é cobrado de verdade.
      </footer>
    </div>
  )
}
