import type { ReactNode } from 'react'

type Row = { label: string; value: ReactNode }

// Bloco azul-claro de "rótulo e valor" da confirmação (Figma 10).
export function OrderDetailsList({ rows }: { rows: Row[] }) {
  return (
    <dl className="flex flex-col gap-2 rounded-lg bg-primary-soft p-4 text-[13px]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4">
          <dt className="text-text-muted">{row.label}</dt>
          <dd className="min-w-0 break-words text-right font-semibold text-navy">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
