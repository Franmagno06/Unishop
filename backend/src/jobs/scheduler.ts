import cron from 'node-cron'
import type { JobRegistry } from './registry'

// Só o `dev-server.ts` importa este arquivo: em produção (Vercel) não há processo vivo, os jobs são
// chamados por endpoint (Vercel Cron e cron-job.org, deploy.md). Frequência igual à de produção.
export function startScheduler(registry: JobRegistry) {
  const run = (name: string) => async () => {
    try {
      console.log(`[job] ${name}`, await registry[name]!())
    } catch (err) {
      console.error(`[job] ${name} falhou:`, err instanceof Error ? err.message : 'erro')
    }
  }
  cron.schedule('*/30 * * * *', run('expire-pix-payments'))
  cron.schedule('*/30 * * * *', run('reconcile-pending-payments'))
  cron.schedule('0 3 * * *', run('cleanup-expired-tokens'))
}
