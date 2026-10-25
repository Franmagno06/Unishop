import { useId, type ComponentProps } from 'react'
import { FieldError } from './FieldError'
import { inputClasses } from './field-styles'

type SelectFieldProps = ComponentProps<'select'> & { label: string; error?: string }

// Lista de escolha com rótulo visível e erro, no mesmo padrão do Field.
export function SelectField({ label, error, className, children, ...props }: SelectFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-text">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${inputClasses(Boolean(error))} ${className ?? ''}`}
        {...props}
      >
        {children}
      </select>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
