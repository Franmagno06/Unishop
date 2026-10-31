import { Router } from 'express'
import { authorizeRole, type Authenticate } from '../../shared/middlewares/authenticate'
import { uploadImage } from '../../shared/middlewares/upload'
import { validateBody, validateQuery } from '../../shared/middlewares/validate'
import { createListingsController } from './listings.controller'
import {
  createListingBodySchema,
  listListingsQuerySchema,
  recentQuerySchema,
  updateListingBodySchema,
} from './listings.schemas'
import type { ListingsService } from './listings.service'

export function createListingsRoutes(service: ListingsService, authenticate: Authenticate) {
  const c = createListingsController(service)
  const router = Router()

  // Única rota de catálogo pública (RF001.4): carrossel da tela inicial, sem contato.
  router.get('/recent', validateQuery(recentQuerySchema), c.recent)
  // Daqui para baixo, só aluno logado (RN-CAT-04). `/recent` precisa vir antes de `/:id`.
  router.get('/', authenticate(), validateQuery(listListingsQuerySchema), c.list) // RN-ANU-05 a 07
  router.get('/mine', authenticate(), c.mine) // RF012.5 (precisa vir antes de /:id)
  router.get('/:id', authenticate(), c.get) // RF008, RN-ANU-05, 11
  router.get('/:id/management', authenticate(), c.management) // RN-ANU-08

  // Anunciar: a autenticação e o papel vêm antes do upload, para ninguém sem permissão enviar arquivo.
  router.post(
    '/',
    authenticate(),
    authorizeRole('student'), // RN-ANU-01: admin não anuncia
    uploadImage(),
    validateBody(createListingBodySchema),
    c.create,
  ) // RN-ANU-01 a 03, 12, RN-EST-01
  router.post('/:id/images', authenticate(), uploadImage(), c.addImage) // RN-ANU-03, 04
  router.delete('/:id/images/:imageId', authenticate(), c.removeImage) // RN-ANU-03, 04

  // Gerenciar: sempre o dono (RN-ANU-04); a conferência de dono está no service.
  router.patch('/:id', authenticate(), validateBody(updateListingBodySchema), c.update)
  router.post('/:id/pause', authenticate(), c.action('pause')) // RF017.7
  router.post('/:id/reactivate', authenticate(), c.action('reactivate')) // RF017.8
  router.post('/:id/mark-sold', authenticate(), c.action('mark-sold')) // RF017.9, RN-EST-06
  router.delete('/:id', authenticate(), c.remove) // RN-ANU-09
  return router
}
