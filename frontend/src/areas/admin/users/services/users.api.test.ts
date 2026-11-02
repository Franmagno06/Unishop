import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'

vi.mock('../../../../shared/lib/mock-mode', () => ({ MOCK_MODE: false }))
const api = vi.fn()
vi.mock('../../../../shared/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../shared/lib/api')>()),
  api: (...args: unknown[]) => api(...args),
}))

import { deleteUser, getUserDetail, getUserStats, listUsers, updateUser } from './users.service'

const row = {
  id: 7,
  name: 'Ana Lima',
  email: 'ana@edu.unifor.br',
  course: null,
  whatsapp: null,
  avatarUrl: null,
  role: 'student',
  status: 'active',
  createdAt: '2026-10-01T10:00:00.000Z',
  lastAccessAt: null,
  isOnline: false,
  listingsCount: 2,
}

beforeEach(() => api.mockReset())

describe('API real · usuários do admin', () => {
  it('RN-ADM-02: listUsers manda page, limit=7 e search, e converte meta em Page', async () => {
    api.mockResolvedValue({ data: [row], meta: { page: 2, limit: 7, total: 8, totalPages: 2 } })
    const page = await listUsers({ search: 'ana lima', presence: 'all', page: 2 })
    expect(api).toHaveBeenCalledWith(
      '/admin/users?page=2&limit=7&search=ana+lima&presence=all',
      expect.anything(),
    )
    expect(page).toMatchObject({ total: 8, page: 2, pageSize: 7, totalPages: 2 })
  })

  it('RN-ADM-03: presence=online chega como query presence=online; busca vazia não é enviada', async () => {
    api.mockResolvedValue({ data: [], meta: { page: 1, limit: 7, total: 0, totalPages: 0 } })
    await listUsers({ search: '', presence: 'online', page: 1 })
    expect(api).toHaveBeenCalledWith('/admin/users?page=1&limit=7&presence=online', expect.anything())
  })

  it('usuário com curso, WhatsApp e último acesso nulos vira texto vazio e usa a data de cadastro', async () => {
    api.mockResolvedValue({ data: [row], meta: { page: 1, limit: 7, total: 1, totalPages: 1 } })
    const [user] = (await listUsers({ search: '', presence: 'all', page: 1 })).items
    expect(user).toMatchObject({
      course: '',
      whatsapp: '',
      lastAccessAt: row.createdAt,
      listingsCount: 2,
    })
    expect(user).not.toHaveProperty('role')
  })

  it('RN-ADM-02: getUserStats devolve os três indicadores', async () => {
    api.mockResolvedValue({ data: { total: 10, online: 2, newThisWeek: 3 } })
    expect(await getUserStats()).toEqual({ total: 10, online: 2, newThisWeek: 3 })
  })

  it('RN-ADM-04: getUserDetail devolve o aluno, os anúncios e os indicadores', async () => {
    const listings = [{ id: 1, title: 'Livro', priceInCents: 1000, categoryName: 'Livros', status: 'active', imageUrl: null }]
    api.mockResolvedValue({ data: { user: row, listings, stats: { listings: 1, sales: 0, purchases: 2 } } })
    const detail = await getUserDetail(7)
    expect(api).toHaveBeenCalledWith('/admin/users/7', expect.anything())
    expect(detail).toMatchObject({ listings, stats: { listings: 1, sales: 0, purchases: 2 } })
    expect(detail?.user.name).toBe('Ana Lima')
  })

  it('getUserDetail devolve null no 404 e relança os outros erros', async () => {
    api.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'x'))
    expect(await getUserDetail(99)).toBeNull()
    api.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x'))
    await expect(getUserDetail(99)).rejects.toMatchObject({ status: 500 })
  })

  it('RN-ADM-05: updateUser envia PATCH {status} e devolve o usuário', async () => {
    api.mockResolvedValue({ data: { ...row, status: 'suspended' } })
    const user = await updateUser(7, { status: 'suspended' })
    expect(api).toHaveBeenCalledWith('/admin/users/7', { method: 'PATCH', body: { status: 'suspended' } })
    expect(user.status).toBe('suspended')
  })

  it('RN-ADM-06: deleteUser chama DELETE e relança 409 HAS_OPEN_PAID_ORDERS', async () => {
    api.mockResolvedValueOnce(undefined)
    await deleteUser(7)
    expect(api).toHaveBeenCalledWith('/admin/users/7', { method: 'DELETE' })
    api.mockRejectedValueOnce(new ApiError(409, 'HAS_OPEN_PAID_ORDERS', 'x'))
    await expect(deleteUser(7)).rejects.toMatchObject({ status: 409, code: 'HAS_OPEN_PAID_ORDERS' })
  })
})
