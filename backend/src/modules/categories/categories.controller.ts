import type { Request, Response } from 'express'
import type { CategoriesService } from './categories.service'

export function createCategoriesController(service: CategoriesService) {
  return {
    async list(req: Request, res: Response) {
      res.json({ data: await service.list((req.validatedQuery as { search?: string }).search) })
    },
  }
}
