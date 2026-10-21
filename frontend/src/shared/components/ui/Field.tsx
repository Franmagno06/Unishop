import { useId, type ComponentProps } from 'react'
import { FieldError } from './FieldError'
import { inputClasses } from './field-styles'

type FieldProps = ComponentProps<'input'> & {
  label: string
  error?: string
  hint?: string
}

export function Field({
  label,
  error,
  hint,
  className,
  'aria-describedby': extraDescribedBy,
  ...props
}: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null, extraDescribedBy]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`${inputClasses(Boolean(error))} ${className ?? ''}`}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
