import { createBrowserRouter } from 'react-router'
import { adminRoutes } from '../../areas/admin/routes'
import { publicRoutes } from '../../areas/public/routes'
import { userRoutes } from '../../areas/user/routes'
import { RouteFallback } from './RouteFallback'

// Junta as rotas das áreas (público, aluno e administrador).
// A rota raiz sem caminho só existe para dar a tela de carregamento da primeira abertura.
export const router = createBrowserRouter([
  { HydrateFallback: RouteFallback, children: [...publicRoutes, ...userRoutes, ...adminRoutes] },
])
