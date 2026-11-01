import { waitUntil } from '@vercel/functions'

// Tarefa depois da resposta (backend.md §11, "Tarefas depois da resposta"). Na Vercel a função pode
// ser suspensa quando a resposta sai; `waitUntil` a mantém viva até a tarefa terminar. Fora da
// Vercel (dev, testes) a promessa simplesmente roda. Erro vai para o log e nunca derruba a resposta.
// Use para e-mail e notificação. Estorno NÃO: estorno usa `await` (decisão de dinheiro).
const running = new Set<Promise<void>>()

export function runInBackground(task: Promise<unknown>): void {
  const safe = task
    .then(() => undefined)
    .catch((err: unknown) => {
      console.error(
        '[tarefa em segundo plano] falhou:',
        err instanceof Error ? err.message : 'erro',
      )
    })
  running.add(safe)
  void safe.finally(() => running.delete(safe))
  try {
    waitUntil(safe)
  } catch {
    // sem contexto da Vercel: a promessa já está rodando
  }
}

/** Só para os testes: espera as tarefas em segundo plano terminarem. */
export const flushBackground = async () => {
  await Promise.all([...running])
}
