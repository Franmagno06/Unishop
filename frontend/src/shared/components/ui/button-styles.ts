export type ButtonSize = 'md' | 'sm'
export type ButtonVariant = 'primary' | 'secondary' | 'whatsapp' | 'social' | 'danger' | 'danger-outline' | 'success'

const base =
  'inline-flex items-center justify-center gap-2.5 rounded-lg font-semibold ' +
  'transition-[transform,background-color,border-color,opacity] duration-150 ease-out-strong ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-surface hover:bg-primary-hover',
  secondary: 'border-[1.5px] border-border bg-surface text-navy hover:border-navy/40',
  whatsapp: 'bg-whatsapp text-surface hover:bg-whatsapp-hover',
  social: 'border border-border bg-surface text-text hover:border-navy/40',
  // Do Figma ("Perigo" e "Perigo contorno"): ações destrutivas, como excluir perfil ou anúncio.
  danger: 'bg-danger text-surface hover:bg-danger-hover focus-visible:outline-danger',
  success: 'bg-success text-surface hover:bg-success-hover focus-visible:outline-success',
  'danger-outline':
    'border-[1.5px] border-danger bg-surface text-danger hover:bg-danger-soft focus-visible:outline-danger',
}

// `sm`: botões dentro de listas (ex.: ações de cada pedido recebido); `md` é o do Figma.
const sizes: Record<ButtonSize, string> = {
  md: 'px-[22px] py-[13px] text-[15px]',
  sm: 'px-4 py-2 text-sm',
}

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  fullWidth = false,
  size: ButtonSize = 'md',
): string {
  return `${base} ${sizes[size]} ${variants[variant]}${fullWidth ? ' w-full' : ''}`
}
