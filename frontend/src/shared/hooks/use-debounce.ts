import { useEffect, useState } from 'react'

// Devolve o valor só depois de `delay` ms sem mudar (usado na busca, frontend.md §14).
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
