import type { ComponentProps } from 'react'

// Bloco cinza no lugar do conteúdo que ainda carrega. Decorativo: quem anuncia o carregamento é a tela.
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-border motion-reduce:animate-none ${className ?? ''}`}
      {...props}
    />
  )
}
