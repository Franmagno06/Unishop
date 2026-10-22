import { render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FakeIntersectionObserver, installFakeIntersectionObserver } from '../../test/intersection-observer'
import { useReachEnd } from './use-reach-end'

function Probe({
  onReach,
  enabled = true,
  watch,
}: {
  onReach: () => void
  enabled?: boolean
  watch?: unknown
}) {
  const ref = useRef<HTMLDivElement>(null)
  useReachEnd(ref, onReach, { enabled, watch })
  return <div ref={ref} data-testid="marcador" />
}

afterEach(() => vi.unstubAllGlobals())

describe('useReachEnd', () => {
  it('vigia o marcador e chama a função quando ele chega perto da tela', () => {
    const io = installFakeIntersectionObserver()
    const onReach = vi.fn()
    render(<Probe onReach={onReach} />)

    expect(io.active()).toHaveLength(1)
    expect(onReach).not.toHaveBeenCalled()

    io.reachEnd()
    expect(onReach).toHaveBeenCalledTimes(1)
  })

  it('não chama quando o marcador sai da tela', () => {
    const io = installFakeIntersectionObserver()
    const onReach = vi.fn()
    render(<Probe onReach={onReach} />)

    io.leaveEnd()

    expect(onReach).not.toHaveBeenCalled()
  })

  it('pede o carregamento 400 px antes de o marcador aparecer', () => {
    installFakeIntersectionObserver()
    render(<Probe onReach={vi.fn()} />)
    expect(FakeIntersectionObserver.instances[0]!.options?.rootMargin).toBe('400px 0px')
  })

  it('desligado, nem cria a vigia', () => {
    const io = installFakeIntersectionObserver()
    render(<Probe onReach={vi.fn()} enabled={false} />)
    expect(io.active()).toHaveLength(0)
  })

  it('ligar e desligar cria e desfaz a vigia', () => {
    const io = installFakeIntersectionObserver()
    const { rerender } = render(<Probe onReach={vi.fn()} enabled />)
    expect(io.active()).toHaveLength(1)

    rerender(<Probe onReach={vi.fn()} enabled={false} />)
    expect(io.active()).toHaveLength(0)
  })

  it('quando a lista cresce (watch muda), refaz a vigia: se o marcador ainda está à vista, pede de novo', () => {
    const io = installFakeIntersectionObserver()
    const { rerender } = render(<Probe onReach={vi.fn()} watch={12} />)
    const first = FakeIntersectionObserver.instances.length

    rerender(<Probe onReach={vi.fn()} watch={24} />)

    expect(FakeIntersectionObserver.instances.length).toBe(first + 1)
    expect(io.active()).toHaveLength(1)
  })

  it('usa sempre a função mais nova, sem refazer a vigia', () => {
    const io = installFakeIntersectionObserver()
    const antiga = vi.fn()
    const nova = vi.fn()
    const { rerender } = render(<Probe onReach={antiga} />)
    const created = FakeIntersectionObserver.instances.length

    rerender(<Probe onReach={nova} />)
    io.reachEnd()

    expect(FakeIntersectionObserver.instances.length).toBe(created)
    expect(antiga).not.toHaveBeenCalled()
    expect(nova).toHaveBeenCalledTimes(1)
  })

  it('ao sair da tela, desfaz a vigia', () => {
    const io = installFakeIntersectionObserver()
    const { unmount } = render(<Probe onReach={vi.fn()} />)
    unmount()
    expect(io.active()).toHaveLength(0)
  })

  it('em navegador sem IntersectionObserver, não quebra', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    expect(() => render(<Probe onReach={vi.fn()} />)).not.toThrow()
  })
})
