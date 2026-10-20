import { useId, type ComponentProps } from 'react'

type FieldProps = ComponentProps<'input'> & {
  label: string
  error?: string
  hint?: string
}

export function Field({ label, error, hint, className, ...props }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`w-full rounded-lg border bg-surface px-4 py-3.5 text-base text-text placeholder:text-text-muted transition-[border-color,box-shadow] duration-150 ease-out-strong focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          error ? 'border-danger' : 'border-border focus:border-primary'
        } ${className ?? ''}`}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} aria-live="polite" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
