import { Outlet } from 'react-router'
import { AdminSidebar } from './AdminSidebar'

// Layout do painel admin (frontend.md §9): menu lateral à esquerda e a tela à direita. O link
// "pular para o conteúdo" e o <main> seguem o padrão do AppLayout.
export function AdminLayout() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:text-navy focus:shadow"
      >
        Ir para o conteúdo
      </a>
      <AdminSidebar />
      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto flex w-full min-w-0 max-w-[1180px] flex-col gap-6 px-4 pb-16 pt-8 focus:outline-none sm:px-6 lg:px-10 lg:pt-10"
      >
        <Outlet />
      </main>
    </div>
  )
}
