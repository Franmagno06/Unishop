import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  children?: ReactNode
  action?: ReactNode
}

// Estado vazio ou de erro: mensagem clara e, quando houver, a próxima ação (frontend.md §12).
export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <h2 className="font-display text-2xl font-bold text-navy">{title}</h2>
      {children ? <p className="max-w-md text-[15px] text-text-muted">{children}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  )
}
