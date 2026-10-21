import { createBrowserRouter } from 'react-router'
import { publicRoutes } from '../../areas/public/routes'
import { userRoutes } from '../../areas/user/routes'
import { RouteFallback } from './RouteFallback'

// Junta as rotas das áreas. A área admin entra quando essas telas existirem.
// A rota raiz sem caminho só existe para dar a tela de carregamento da primeira abertura.
export const router = createBrowserRouter([
  { HydrateFallback: RouteFallback, children: [...publicRoutes, ...userRoutes] },
])
