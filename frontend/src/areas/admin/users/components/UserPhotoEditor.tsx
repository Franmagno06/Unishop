import { useId, useRef } from 'react'
import { Avatar } from '../../../../shared/components/ui/Avatar'
import { FieldError } from '../../../../shared/components/ui/FieldError'
import { PHOTO_TYPES, validateUserPhoto } from '../schemas/user.schemas'

type UserPhotoEditorProps = {
  name: string
  imageUrl: string | null
  error?: string
  // Recebe o arquivo já validado (JPG ou PNG, até 4 MB) ou a mensagem de erro.
  onSelect: (file: File) => void
  onRemove: () => void
  onError: (message: string) => void
}

const actionClass =
  'cursor-pointer rounded text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

// "Trocar foto" e "Remover foto" (Figma A02b) · RN-ADM-04 e RN-PER-05. A foto só vale ao salvar.
export function UserPhotoEditor({ name, imageUrl, error, onSelect, onRemove, onError }: UserPhotoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const errorId = useId()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <Avatar name={name} imageUrl={imageUrl} className="size-[72px] text-2xl" />
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-describedby={error ? errorId : undefined}
            className={`${actionClass} text-primary hover:underline`}
          >
            Trocar foto
          </button>
          {imageUrl ? (
            <button type="button" onClick={onRemove} className={`${actionClass} text-text-muted hover:text-danger`}>
              Remover foto
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={PHOTO_TYPES.join(',')}
          aria-label="Escolher foto do usuário"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0]
            // Limpa o campo: escolher o mesmo arquivo de novo precisa disparar o evento.
            event.target.value = ''
            if (!file) return
            const problem = validateUserPhoto(file)
            if (problem) onError(problem)
            else onSelect(file)
          }}
        />
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
