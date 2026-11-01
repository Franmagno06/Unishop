// Só desenvolvimento local: liga a porta (e, mais adiante, os jobs do node-cron).
import { app } from './app'
import { env } from './config/env'
import { startScheduler } from './jobs/scheduler'
import type { JobRegistry } from './jobs/registry'

app.listen(env.PORT, () => console.log(`API em http://localhost:${env.PORT}`))

// Jobs agendados só em desenvolvimento; em produção são endpoints (backend.md §14).
startScheduler(app.locals.jobs as JobRegistry)
