// Mostrada enquanto o código da primeira tela carrega (rotas com `lazy`).
export function RouteFallback() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center text-text-muted">
      Carregando…
    </div>
  )
}
