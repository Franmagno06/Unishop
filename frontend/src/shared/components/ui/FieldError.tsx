import { ErrorIcon } from './icons'

// Erro de um campo, logo abaixo dele: ícone + texto (nunca só a cor, frontend.md §14).
export function FieldError({ id, children }: { id?: string; children: string }) {
  return (
    <p id={id} aria-live="polite" className="flex items-start gap-1.5 text-sm text-danger">
      <ErrorIcon className="mt-0.5 size-4" />
      <span>{children}</span>
    </p>
  )
}
