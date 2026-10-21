import type { RouteObject } from 'react-router'
import { GuestRoute } from '../../app/router/guards/GuestRoute'
import { AuthLayout } from './layout/AuthLayout'
import { PublicLayout } from './layout/PublicLayout'

// Cada tela é carregada sob demanda (code splitting por rota).
export const publicRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('./landing/pages/LandingPage')).LandingPage,
        }),
      },
      {
        path: 'termos',
        lazy: async () => ({
          Component: (await import('./legal/pages/LegalPlaceholderPage')).TermsPage,
        }),
      },
      {
        path: 'privacidade',
        lazy: async () => ({
          Component: (await import('./legal/pages/LegalPlaceholderPage')).PrivacyPage,
        }),
      },
      {
        path: '*',
        lazy: async () => ({
          Component: (await import('./legal/pages/NotFoundPage')).NotFoundPage,
        }),
      },
    ],
  },
  {
    // Quem já está logado sai de login e cadastro (GuestRoute)
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: 'login',
            lazy: async () => ({
              Component: (await import('./auth/pages/LoginPage')).LoginPage,
            }),
          },
          {
            // Mesma tela do login; o destino depois de entrar vem do perfil (RN-ACE-13)
            path: 'admin/login',
            lazy: async () => ({
              Component: (await import('./auth/pages/LoginPage')).LoginPage,
            }),
          },
          {
            path: 'cadastro',
            lazy: async () => ({
              Component: (await import('./auth/pages/RegisterPage')).RegisterPage,
            }),
          },
          // Recuperação de senha (RF004): pedir o link, "verifique seu e-mail", nova senha, pronto
          {
            path: 'recuperar-senha',
            lazy: async () => ({
              Component: (await import('./auth/pages/ForgotPasswordPage')).ForgotPasswordPage,
            }),
          },
          {
            path: 'recuperar-senha/enviado',
            lazy: async () => ({
              Component: (await import('./auth/pages/CheckEmailPage')).CheckEmailPage,
            }),
          },
          {
            path: 'redefinir-senha/:token',
            lazy: async () => ({
              Component: (await import('./auth/pages/ResetPasswordPage')).ResetPasswordPage,
            }),
          },
          {
            path: 'senha-redefinida',
            lazy: async () => ({
              Component: (await import('./auth/pages/ResetSuccessPage')).ResetSuccessPage,
            }),
          },
        ],
      },
    ],
  },
]
