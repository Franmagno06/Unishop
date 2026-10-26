import type { ReactNode } from 'react'

type AdminPageHeadingProps = {
  title: string
  subtitle?: string
  // Botões do canto direito (ex.: "Excluir usuário" e "Editar usuário").
  actions?: ReactNode
}

// Título da tela do painel (Figma: Spectral 40 px, azul-marinho) com o texto de apoio e as ações.
export function AdminPageHeading({ title, subtitle, actions }: AdminPageHeadingProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="break-words font-display text-4xl font-bold text-navy md:text-[40px]">{title}</h1>
        {subtitle ? <p className="text-[15px] text-text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}
