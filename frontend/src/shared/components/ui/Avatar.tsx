import { getInitials } from '../../utils/initials'

type AvatarProps = {
  name: string
  imageUrl?: string | null
  // Tamanho e corpo do texto vêm de quem usa: 96 px no perfil, 72 px na edição, 40 px nas listas.
  className?: string
}

// Círculo azul-claro com as iniciais (Figma) ou a foto. Decorativo: o nome vem escrito ao lado.
export function Avatar({ name, imageUrl, className = 'size-10 text-[13px]' }: AvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-bold text-navy ${className}`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="size-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
