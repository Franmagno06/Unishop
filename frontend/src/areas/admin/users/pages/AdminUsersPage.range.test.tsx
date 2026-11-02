import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

const listUsers = vi.fn()
vi.mock('../services/users.service', () => ({
  listUsers: (...args: unknown[]) => listUsers(...args),
  getUserStats: async () => ({ total: 7, online: 0, newThisWeek: 0 }),
}))

import { AdminUsersPage } from './AdminUsersPage'

describe('AdminUsersPage · página além do fim', () => {
  it('RN-ADM-02: depois de excluir o último item da página 2, a URL volta à página 1 e a lista reaparece', async () => {
    const row = { id: 1, name: 'Ana Lima', email: 'ana@edu.unifor.br', course: '', whatsapp: '', avatarUrl: null,
      status: 'active', createdAt: '2026-10-01T10:00:00Z', lastAccessAt: '2026-10-01T10:00:00Z', isOnline: false, listingsCount: 0 }
    listUsers.mockImplementation(async ({ page }: { page: number }) =>
      page === 1
        ? { items: [row], total: 1, page: 1, pageSize: 7, totalPages: 1 }
        : { items: [], total: 1, page, pageSize: 7, totalPages: 1 },
    )
    const router = createMemoryRouter([{ path: '/admin/usuarios', element: <AdminUsersPage /> }], {
      initialEntries: ['/admin/usuarios?pagina=2'],
    })
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })
})
