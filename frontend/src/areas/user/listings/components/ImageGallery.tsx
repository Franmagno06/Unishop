import { useState } from 'react'

type ImageGalleryProps = {
  images: string[]
  title: string
}

// Galeria do produto (Figma 08a, RN-ANU-03): imagem principal e miniaturas de 1 a 5 fotos. Sem foto,
// mostra o bloco azul-claro. As miniaturas são botões (teclado e leitor de tela); a escolhida
// leva a borda azul e `aria-current`. Quem usa deve dar `key` por anúncio para voltar à 1ª foto.
export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [selected, setSelected] = useState(0)
  const current = images[selected] ?? images[0]

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {current ? (
        <img
          src={current}
          alt={`${title}: foto ${selected + 1} de ${images.length}`}
          className="aspect-[620/460] w-full rounded-2xl bg-primary-soft object-cover"
        />
      ) : (
        <div role="img" aria-label="Anúncio sem foto" className="aspect-[620/460] w-full rounded-2xl bg-primary-soft" />
      )}

      {images.length > 1 ? (
        <ul className="flex flex-wrap gap-3" aria-label="Fotos do anúncio">
          {images.map((image, index) => (
            <li key={image}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Ver foto ${index + 1} de ${images.length}`}
                aria-current={index === selected ? 'true' : undefined}
                className={`block h-[72px] w-24 overflow-hidden rounded-lg border-2 bg-primary-soft transition-[border-color,opacity] duration-150 ease-out-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  index === selected ? 'border-primary' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                <img src={image} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
