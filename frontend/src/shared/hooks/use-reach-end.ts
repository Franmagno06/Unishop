import { useEffect, useRef, type RefObject } from 'react'

// Rolagem infinita: chama `onReach` quando o marcador `ref` chega perto da tela (`margin` px antes).
// `enabled` desliga a vigia (sem próxima página, carregando, com erro). `watch` é um valor que muda
// quando a lista cresce: a vigia é refeita e, se o marcador ainda estiver à vista (tela alta),
// a próxima página é pedida de novo, sem o usuário precisar rolar.
export function useReachEnd(
  ref: RefObject<Element | null>,
  onReach: () => void,
  { enabled, watch, margin = 400 }: { enabled: boolean; watch?: unknown; margin?: number },
): void {
  const handler = useRef(onReach)
  useEffect(() => {
    handler.current = onReach
  })

  useEffect(() => {
    const target = ref.current
    if (!enabled || !target || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) handler.current()
      },
      { rootMargin: `${margin}px 0px` },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [ref, enabled, watch, margin])
}
