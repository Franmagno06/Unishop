import { useEffect, useId, useState, type DragEvent } from 'react'
import { FieldError } from '../../../../shared/components/ui/FieldError'
import { CloseIcon, UploadIcon } from '../../../../shared/components/ui/icons'
import { LISTING_LIMITS, validateImageFile } from '../schemas/listing.schemas'

type ImageUploaderProps = {
  files: File[]
  onChange: (files: File[]) => void
  error?: string | undefined
}

// Miniatura: cria a URL de visualização e a libera ao sair (evita vazar memória).
function Thumbnail({ file, isCover, onRemove }: { file: File; isCover: boolean; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (typeof URL.createObjectURL !== 'function') return
    const objectUrl = URL.createObjectURL(file)
    // A URL só existe depois de montar (e precisa ser liberada ao sair), por isso nasce no efeito.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  return (
    <li className="relative size-24 overflow-hidden rounded-lg border border-border bg-primary-soft">
      {url ? <img src={url} alt={`Foto: ${file.name}`} className="size-full object-cover" /> : null}
      {isCover ? (
        <span className="absolute bottom-1 left-1 rounded bg-navy/80 px-1.5 py-0.5 text-[11px] font-semibold text-surface">
          Capa
        </span>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover foto ${file.name}`}
        className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-navy/80 text-surface hover:bg-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <CloseIcon className="size-3.5" />
      </button>
    </li>
  )
}

// RN-ANU-03: de 1 a 5 imagens JPG ou PNG, até 4 MB cada. Clique, teclado (o campo de arquivo fica
// escondido só visualmente) ou arrastar e soltar. Arquivo recusado não entra e o motivo aparece.
export function ImageUploader({ files, onChange, error }: ImageUploaderProps) {
  const id = useId()
  const [rejections, setRejections] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const full = files.length >= LISTING_LIMITS.imagesMax

  function addFiles(incoming: File[]) {
    const accepted: File[] = []
    const problems: string[] = []
    for (const file of incoming) {
      const problem = validateImageFile(file)
      if (problem) problems.push(problem)
      else if (files.length + accepted.length >= LISTING_LIMITS.imagesMax) {
        problems.push(`“${file.name}” não entrou: o máximo é ${LISTING_LIMITS.imagesMax} fotos.`)
      } else accepted.push(file)
    }
    setRejections(problems)
    if (accepted.length > 0) onChange([...files, ...accepted])
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragging(false)
    if (!full) addFiles(Array.from(event.dataTransfer.files))
  }

  const problems = [...(error ? [error] : []), ...rejections]

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text">Imagens do produto *</span>
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-primary px-4 py-5 text-center transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${
          dragging ? 'bg-primary/15' : 'bg-primary-soft'
        } ${full ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <UploadIcon className="size-6 text-primary" />
        <span className="text-[15px] font-semibold text-navy">Arraste fotos ou clique para enviar</span>
        <span className="text-[13px] text-text-muted">
          JPG ou PNG, até 4 MB cada, de {LISTING_LIMITS.imagesMin} a {LISTING_LIMITS.imagesMax} fotos
        </span>
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          disabled={full}
          className="sr-only"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []))
            event.target.value = '' // permite escolher o mesmo arquivo de novo
          }}
        />
      </label>

      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-3" aria-label="Fotos escolhidas">
          {files.map((file, index) => (
            <Thumbnail
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              file={file}
              isCover={index === 0}
              onRemove={() => onChange(files.filter((_, position) => position !== index))}
            />
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-text-muted">
        {files.length} de {LISTING_LIMITS.imagesMax} fotos. A primeira é a capa do anúncio.
      </p>
      {problems.map((problem) => (
        <FieldError key={problem}>{problem}</FieldError>
      ))}
    </div>
  )
}
