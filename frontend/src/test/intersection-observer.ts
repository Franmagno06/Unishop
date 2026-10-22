import { act } from '@testing-library/react'
import { vi } from 'vitest'

// O jsdom não tem IntersectionObserver. Este substituto deixa o teste "rolar até o fim" à mão.
export class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []

  readonly elements = new Set<Element>()
  disconnected = false
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: number[] = []

  private readonly callback: IntersectionObserverCallback
  readonly options: IntersectionObserverInit | undefined

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
    FakeIntersectionObserver.instances.push(this)
  }

  observe(element: Element) {
    this.elements.add(element)
  }
  unobserve(element: Element) {
    this.elements.delete(element)
  }
  disconnect() {
    this.elements.clear()
    this.disconnected = true
  }
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  fire(isIntersecting: boolean) {
    const entries = [...this.elements].map(
      (target) => ({ isIntersecting, target }) as unknown as IntersectionObserverEntry,
    )
    this.callback(entries, this as unknown as IntersectionObserver)
  }
}

export function installFakeIntersectionObserver() {
  FakeIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

  const active = () =>
    FakeIntersectionObserver.instances.filter((observer) => !observer.disconnected && observer.elements.size > 0)

  return {
    active,
    // "O marcador do fim da lista apareceu perto da tela."
    reachEnd: () => act(() => active().at(-1)?.fire(true)),
    leaveEnd: () => act(() => active().at(-1)?.fire(false)),
  }
}
