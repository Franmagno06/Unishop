import { useState } from 'react'
import type { AdminProductImage } from '../types/product.types'

// Galeria do produto (Figma A04): imagem grande e miniaturas. Sem foto de verdade, mostra o bloco
// azul-claro do protótipo. A miniatura escolhida fica com borda azul.
export function ProductGallery({ images, title }: { images: AdminProductImage[]; title: string }) {
  const [selected, setSelected] = useState(0)
  const current = images[Math.min(selected, images.length - 1)]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-primary-soft">
        {current?.url ? (
          <img src={current.url} alt={title} className="size-full object-cover" />
        ) : (
          <span className="px-6 text-center text-sm text-text-muted">Sem foto para mostrar</span>
        )}
      </div>
      {images.length > 1 ? (
        <ul className="flex gap-3" aria-label="Fotos do produto">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                aria-label={`Ver foto ${index + 1} de ${images.length}`}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
                className="block h-16 w-[84px] cursor-pointer overflow-hidden rounded-lg border-2 border-transparent bg-primary-soft transition-colors duration-150 aria-pressed:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {image.url ? <img src={image.url} alt="" className="size-full object-cover" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
