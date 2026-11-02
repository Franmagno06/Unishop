import type { RouteObject } from 'react-router'
import { PrivateRoute } from '../../app/router/guards/PrivateRoute'
import { AppLayout } from './layout/AppLayout'

// Área do aluno. O PrivateRoute é só UX (RN-ACE-11, RN-CAT-04): sem sessão vai ao login, e com o
// aceite dos Termos pendente vai a "Completar cadastro". A barreira de verdade é o backend.
export const userRoutes: RouteObject[] = [
  {
    element: <PrivateRoute />,
    children: [
      {
        // Sem o cabeçalho do aluno: com o aceite pendente, as outras páginas respondem 403 TERMS_NOT_ACCEPTED.
        path: 'completar-cadastro',
        lazy: async () => ({
          Component: (await import('./profile/pages/CompleteProfilePage')).CompleteProfilePage,
        }),
      },
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
            path: 'confirmar-troca-email/:token',
            lazy: async () => ({
              Component: (await import('./profile/pages/ConfirmEmailChangePage')).ConfirmEmailChangePage,
            }),
          },
          {
            path: 'trocar-senha',
            lazy: async () => ({
              Component: (await import('./profile/pages/ChangePasswordPage')).ChangePasswordPage,
            }),
          },
          {
            path: 'meus-pedidos',
            lazy: async () => ({
              Component: (await import('./orders/pages/MyOrdersPage')).MyOrdersPage,
            }),
          },
          {
            path: 'meus-pedidos/:id',
            lazy: async () => ({
              Component: (await import('./orders/pages/OrderDetailsPage')).OrderDetailsPage,
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
    ],
  },
]
