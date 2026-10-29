import type { Request, Response } from 'express'
import type { AuthService } from './auth.service'

export function createAuthController(service: AuthService) {
  return {
    async register(req: Request, res: Response) {
      res.status(201).json({ data: await service.register(req.body) })
    },
    async login(req: Request, res: Response) {
      res.json({ data: await service.login(req.body) })
    },
    async forgotPassword(req: Request, res: Response) {
      await service.forgotPassword(req.body)
      res.status(202).end()
    },
    async resetPassword(req: Request, res: Response) {
      await service.resetPassword(req.body)
      res.status(200).end()
    },
    async me(req: Request, res: Response) {
      res.json({ data: await service.me(req.user!.id) })
    },
    async changePassword(req: Request, res: Response) {
      res.json({ data: await service.changePassword(req.user!.id, req.body) })
    },
  }
}
