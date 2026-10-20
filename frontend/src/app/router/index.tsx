import { createBrowserRouter } from 'react-router'
import { publicRoutes } from '../../areas/public/routes'

// Junta as rotas das áreas. user/ e admin/ entram quando essas telas existirem.
export const router = createBrowserRouter([...publicRoutes])
