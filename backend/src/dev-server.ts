// Só desenvolvimento local: liga a porta (e, mais adiante, os jobs do node-cron).
import { app } from './app'
import { env } from './config/env'

app.listen(env.PORT, () => console.log(`API em http://localhost:${env.PORT}`))
