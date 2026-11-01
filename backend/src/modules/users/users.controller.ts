import type { Request, Response } from 'express'
import type { UsersService } from './users.service'

export function createUsersController(service: UsersService) {
  return {
    async me(req: Request, res: Response) {
      res.json({ data: await service.me(req.user!.id) })
    },
    async update(req: Request, res: Response) {
      res.json({ data: await service.updateProfile(req.user!.id, req.body) })
    },
    async requestEmailChange(req: Request, res: Response) {
      res.status(202).json({ data: await service.requestEmailChange(req.user!.id, req.body.email) })
    },
    async confirmEmailChange(req: Request, res: Response) {
      res.json({ data: await service.confirmEmailChange(req.user!.id, req.body.token) })
    },
    async avatar(req: Request, res: Response) {
      res.json({ data: await service.setAvatar(req.user!.id, req.file!.buffer) })
    },
    async remove(req: Request, res: Response) {
      await service.deleteAccount(req.user!.id)
      res.status(204).end()
    },
  }
}
