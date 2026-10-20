export type ButtonVariant = 'primary' | 'secondary' | 'whatsapp' | 'social'

const base =
  'inline-flex items-center justify-center gap-2.5 rounded-lg px-[22px] py-[13px] text-[15px] font-semibold ' +
  'transition-[transform,background-color,border-color,opacity] duration-150 ease-out-strong ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-surface hover:bg-primary-hover',
  secondary: 'border-[1.5px] border-border bg-surface text-navy hover:border-navy/40',
  whatsapp: 'bg-whatsapp text-surface hover:bg-whatsapp-hover',
  social: 'border border-border bg-surface text-text hover:border-navy/40',
}

export function buttonClasses(variant: ButtonVariant = 'primary', fullWidth = false): string {
  return `${base} ${variants[variant]}${fullWidth ? ' w-full' : ''}`
}
