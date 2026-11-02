import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('../../../../shared/lib/mock-mode')
})

describe('support.service · protótipo fora do MVP', () => {
  it('com a API real a lista de solicitações vem vazia, sem dado inventado', async () => {
    vi.resetModules()
    vi.doMock('../../../../shared/lib/mock-mode', () => ({ MOCK_MODE: false }))
    const { listSupportRequests, updateSupportRequestStatus } = await import('./support.service')
    expect(await listSupportRequests()).toEqual([])
    await expect(updateSupportRequestStatus(1, 'resolved')).resolves.toBeUndefined()
  })

  it('em modo de demonstração mantém as solicitações de exemplo', async () => {
    vi.resetModules()
    vi.doMock('../../../../shared/lib/mock-mode', () => ({ MOCK_MODE: true }))
    const { listSupportRequests } = await import('./support.service')
    const requests = await listSupportRequests()
    expect(requests.length).toBeGreaterThan(0)
    expect(requests[0]?.userEmail).toMatch(/@edu\.unifor\.br$/)
  })
})
