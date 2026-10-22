import type { RouteObject } from 'react-router'
import { AppLayout } from './layout/AppLayout'

// Área do aluno. Por enquanto as rotas ficam abertas: o PrivateRoute entra junto com a API
// (RN-CAT-04 vale no backend; o guard do frontend é só UX).
export const userRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      {
        path: 'categorias',
        lazy: async () => ({
          Component: (await import('./categories/pages/CategoriesPage')).CategoriesPage,
        }),
      },
      {
        path: 'categorias/:id',
        lazy: async () => ({
          Component: (await import('./listings/pages/CategoryListingsPage')).CategoryListingsPage,
        }),
      },
      {
        path: 'anunciar',
        lazy: async () => ({
          Component: (await import('./listings/pages/CreateListingPage')).CreateListingPage,
        }),
      },
    ],
  },
]
