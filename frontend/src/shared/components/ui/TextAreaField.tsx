import { useId, type ComponentProps } from 'react'
import { FieldError } from './FieldError'
import { inputClasses } from './field-styles'

type TextAreaFieldProps = ComponentProps<'textarea'> & { label: string; error?: string; hint?: string }

// Texto de várias linhas com rótulo visível, dica e erro, no mesmo padrão do Field.
export function TextAreaField({ label, error, hint, className, ...props }: TextAreaFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`${inputClasses(Boolean(error))} min-h-28 resize-y ${className ?? ''}`}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
