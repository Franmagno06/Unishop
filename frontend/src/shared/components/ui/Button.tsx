import type { ComponentProps } from 'react'
import { Link } from 'react-router'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './button-styles'

type Extra = { variant?: ButtonVariant; fullWidth?: boolean; size?: ButtonSize }

export function Button({
  variant,
  fullWidth,
  size,
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & Extra) {
  return (
    <button
      type={type}
      className={`${buttonClasses(variant, fullWidth, size)} ${className ?? ''}`}
      {...props}
    />
  )
}

export function ButtonLink({
  variant,
  fullWidth,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & Extra) {
  return <Link className={`${buttonClasses(variant, fullWidth, size)} ${className ?? ''}`} {...props} />
}
