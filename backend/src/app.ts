import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env'

export const app = express()

app.use(helmet())
app.use(cors({ origin: env.FRONTEND_URL }))
app.use(compression())
app.use(express.json())

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' })
})

export default app // a Vercel usa este export; nada aqui chama listen
