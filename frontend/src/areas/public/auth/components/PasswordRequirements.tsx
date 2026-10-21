import { CheckCircleIcon, CircleIcon } from '../../../../shared/components/ui/icons'
import { PASSWORD_RULES } from '../schemas/auth.schemas'

// Lista que marca cada requisito da senha enquanto o aluno digita (RN-ACE-04).
// Cada item diz "atendido" ou "pendente" por texto (leitor de tela), não só pela cor ou pelo ícone.
export function PasswordRequirements({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} aria-label="Requisitos da senha" className="flex flex-col gap-1.5">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-2 text-[13px] transition-colors duration-150 ${
              met ? 'text-whatsapp' : 'text-text-muted'
            }`}
          >
            {met ? <CheckCircleIcon className="size-4" /> : <CircleIcon className="size-4" />}
            <span>{rule.label}</span>
            <span className="sr-only">{met ? '(atendido)' : '(pendente)'}</span>
          </li>
        )
      })}
    </ul>
  )
}
