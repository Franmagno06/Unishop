import { Skeleton } from '../../../../shared/components/ui/Skeleton'

export type StatItem = {
  label: string
  value: string
  // Bolinha verde ao lado do número ("Logados agora").
  live?: boolean
}

// Os três indicadores do topo das listas (Figma A01 e A03). Sem dados ainda, mostra esqueletos.
export function StatsCards({ items, label }: { items: StatItem[] | undefined; label: string }) {
  return (
    <section aria-label={label} className="grid gap-4 md:grid-cols-3">
      {(items ?? [null, null, null]).map((item, index) => (
        <div key={item?.label ?? index} className="rounded-2xl border border-border bg-surface px-5 py-5">
          {item ? (
            <>
              <p className="flex items-center gap-2.5 font-display text-4xl font-bold text-navy">
                {item.live ? (
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-whatsapp" />
                ) : null}
                {item.value}
              </p>
              <p className="mt-1 text-sm text-text-muted">{item.label}</p>
            </>
          ) : (
            <>
              <Skeleton className="h-10 w-24" />
              <Skeleton className="mt-2 h-4 w-32" />
            </>
          )}
        </div>
      ))}
    </section>
  )
}
