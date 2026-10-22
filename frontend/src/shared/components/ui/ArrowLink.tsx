import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { ArrowLeftIcon } from './icons'

// "← Texto": link de retorno no estilo do Figma (seta + texto azul). O destino é fixo e o texto
// diz para onde vai (ex.: "← Categorias"). Para "voltar à tela anterior" use o BackLink.
export function ArrowLink({ children, className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={`group inline-flex items-center gap-1.5 self-start rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className ?? ''}`}
      {...props}
    >
      <ArrowLeftIcon className="size-4 transition-transform duration-150 ease-out-strong group-hover:-translate-x-0.5 motion-reduce:transition-none" />
      {children}
    </Link>
  )
}
