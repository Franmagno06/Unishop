import { Navigate, type RouteObject } from 'react-router'
import { AdminRoute } from '../../app/router/guards/AdminRoute'
import { ROUTES } from '../../shared/constants/routes'
import { AdminLayout } from './layout/AdminLayout'

// Área do administrador (RF018 a RF024, frontend.md §7). O AdminRoute leva quem não entrou ao login
// do admin e mostra "acesso negado" ao aluno; o código do painel só baixa quando alguém abre /admin.
export const adminRoutes: RouteObject[] = [
  {
    element: <AdminRoute />,
    children: [
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.adminUsers} replace /> },
          {
            path: 'usuarios',
            lazy: async () => ({
              Component: (await import('./users/pages/AdminUsersPage')).AdminUsersPage,
            }),
          },
          {
            path: 'usuarios/:id',
            lazy: async () => ({
              Component: (await import('./users/pages/AdminUserDetailPage')).AdminUserDetailPage,
            }),
          },
          {
            path: 'usuarios/:id/editar',
            lazy: async () => ({
              Component: (await import('./users/pages/AdminUserEditPage')).AdminUserEditPage,
            }),
          },
          {
            path: 'produtos',
            lazy: async () => ({
              Component: (await import('./products/pages/AdminProductsPage')).AdminProductsPage,
            }),
          },
          {
            path: 'produtos/:id',
            lazy: async () => ({
              Component: (await import('./products/pages/AdminProductDetailPage')).AdminProductDetailPage,
            }),
          },
          {
            path: 'produtos/:id/editar',
            lazy: async () => ({
              Component: (await import('./products/pages/AdminProductEditPage')).AdminProductEditPage,
            }),
          },
          {
            path: '*',
            lazy: async () => ({
              Component: (await import('./shared/components/AdminNotFoundPage')).AdminNotFoundPage,
            }),
          },
        ],
      },
    ],
  },
]
