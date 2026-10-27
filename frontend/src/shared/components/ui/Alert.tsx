import type { ReactNode } from 'react'
import { CheckCircleIcon, ErrorIcon, InfoIcon } from './icons'

type AlertProps = {
  title?: string
  children: ReactNode
}

// Caixa de mensagem no padrão dos grandes sites: fundo suave, faixa colorida à esquerda, ícone,
// título curto e a mensagem. Cada tipo é um componente explícito (sem prop booleana de modo).
function AlertBox({
  tone,
  role,
  icon,
  title,
  children,
}: AlertProps & {
  tone: string
  role?: 'alert' | 'status'
  icon: ReactNode
}) {
  return (
    <div
      role={role}
      className={`flex gap-3 rounded-lg border border-l-4 p-4 transition-opacity duration-200 ease-out-strong starting:opacity-0 ${tone}`}
    >
      {icon}
      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        <p className="break-words text-text">{children}</p>
      </div>
    </div>
  )
}

// Erro de um envio (credencial errada, servidor fora do ar). Anunciado na hora pelo leitor de tela.
export function ErrorAlert(props: AlertProps) {
  return (
    <AlertBox
      {...props}
      role="alert"
      tone="border-danger/30 border-l-danger bg-danger-soft text-danger"
      icon={<ErrorIcon className="mt-0.5 size-5" />}
    />
  )
}

// Confirmação de algo que deu certo ("Conta criada!"). Anunciada com educação, sem interromper.
export function SuccessAlert(props: AlertProps) {
  return (
    <AlertBox
      {...props}
      role="status"
      tone="border-whatsapp/30 border-l-whatsapp bg-success-soft text-whatsapp"
      icon={<CheckCircleIcon className="mt-0.5 size-5" />}
    />
  )
}

// Informação fixa, sem urgência (por exemplo, o aviso do modo de demonstração).
export function InfoAlert(props: AlertProps) {
  return (
    <AlertBox
      {...props}
      tone="border-primary/30 border-l-primary bg-primary-soft text-primary"
      icon={<InfoIcon className="mt-0.5 size-5" />}
    />
  )
}
