import { useId, useRef } from 'react'
import { Avatar } from '../../../../shared/components/ui/Avatar'
import { FieldError } from '../../../../shared/components/ui/FieldError'
import { AVATAR_TYPES, validateAvatarFile } from '../schemas/profile.schemas'

type AvatarUploaderProps = {
  name: string
  imageUrl: string | null
  error?: string
  // Recebe o arquivo já validado (JPG ou PNG, até 4 MB) ou a mensagem de erro.
  onSelect: (file: File) => void
  onError: (message: string) => void
}

// "Alterar foto" (Figma 05b) · RN-PER-05. A foto só vale ao salvar; aqui ela aparece em prévia.
export function AvatarUploader({ name, imageUrl, error, onSelect, onError }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const errorId = useId()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <Avatar name={name} imageUrl={imageUrl} className="size-[72px] text-2xl" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-describedby={error ? errorId : undefined}
          className="cursor-pointer rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Alterar foto
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_TYPES.join(',')}
          aria-label="Escolher foto de perfil"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0]
            // Limpa o campo: escolher o mesmo arquivo de novo precisa disparar o evento.
            event.target.value = ''
            if (!file) return
            const problem = validateAvatarFile(file)
            if (problem) onError(problem)
            else onSelect(file)
          }}
        />
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
