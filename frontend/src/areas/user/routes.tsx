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
        path: 'produtos/:id',
        lazy: async () => ({
          Component: (await import('./listings/pages/ProductPage')).ProductPage,
        }),
      },
      {
        path: 'pagamento/:pedidoId',
        lazy: async () => ({
          Component: (await import('./checkout/pages/PaymentPage')).PaymentPage,
        }),
      },
      {
        path: 'pedido-confirmado/:pedidoId',
        lazy: async () => ({
          Component: (await import('./checkout/pages/OrderConfirmedPage')).OrderConfirmedPage,
        }),
      },
      {
        path: 'anunciar',
        lazy: async () => ({
          Component: (await import('./listings/pages/CreateListingPage')).CreateListingPage,
        }),
      },
      {
        path: 'perfil',
        lazy: async () => ({
          Component: (await import('./profile/pages/ProfilePage')).ProfilePage,
        }),
      },
      {
        path: 'perfil/editar',
        lazy: async () => ({
          Component: (await import('./profile/pages/EditProfilePage')).EditProfilePage,
        }),
      },
      {
        path: 'meus-pedidos',
        lazy: async () => ({
          Component: (await import('./orders/pages/MyOrdersPage')).MyOrdersPage,
        }),
      },
      {
        path: 'anuncios/:id/gerenciar',
        lazy: async () => ({
          Component: (await import('./listings/pages/ManageListingPage')).ManageListingPage,
        }),
      },
    ],
  },
]
