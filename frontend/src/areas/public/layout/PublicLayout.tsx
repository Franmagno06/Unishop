import { Outlet } from 'react-router'
import { Footer } from './Footer'
import { PublicHeader } from './PublicHeader'

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:text-navy focus:shadow"
      >
        Ir para o conteúdo
      </a>
      <PublicHeader />
      <main id="conteudo" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
