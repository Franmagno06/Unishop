// Estilo comum dos campos de texto: o Field (com rótulo visível) e a busca (rótulo só para leitor
// de tela) compartilham esta base em vez de uma prop booleana de variação.
export function inputClasses(hasError = false): string {
  return (
    'w-full rounded-lg border bg-surface px-4 py-3.5 text-base text-text placeholder:text-text-muted ' +
    'transition-[border-color,box-shadow] duration-150 ease-out-strong focus:outline-none focus:ring-2 focus:ring-primary/30 ' +
    (hasError ? 'border-danger' : 'border-border focus:border-primary')
  )
}
