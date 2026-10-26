import { useId, useRef } from 'react'
import { FieldError } from '../../../../shared/components/ui/FieldError'
import { PRODUCT_IMAGE_TYPES, validateProductImage } from '../schemas/product.schemas'

type ProductImageEditorProps = {
  imageUrl: string | null
  error?: string
  onSelect: (file: File) => void
  onError: (message: string) => void
}

// "Imagem do produto" (Figma A05): o bloco inteiro é o botão de trocar. A imagem só vale ao salvar.
export function ProductImageEditor({ imageUrl, error, onSelect, onError }: ProductImageEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const errorId = useId()

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-describedby={error ? errorId : undefined}
        className="relative flex h-[220px] w-full cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl bg-primary-soft px-4 text-center transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" /> : null}
        <span
          className={`relative text-sm font-semibold text-navy ${imageUrl ? 'rounded bg-surface/90 px-2 py-1' : ''}`}
        >
          {imageUrl ? 'Trocar a imagem' : 'Imagem atual do produto'}
        </span>
        {imageUrl ? null : (
          <span className="relative text-xs text-text-muted">
            Clique para trocar a imagem (JPG ou PNG, até 4 MB)
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={PRODUCT_IMAGE_TYPES.join(',')}
        aria-label="Escolher imagem do produto"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Limpa o campo: escolher o mesmo arquivo de novo precisa disparar o evento.
          event.target.value = ''
          if (!file) return
          const problem = validateProductImage(file)
          if (problem) onError(problem)
          else onSelect(file)
        }}
      />
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}
