import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Máquinas lentas (OneDrive, antivírus, CI) precisam de mais que 1 s para a tela seguinte aparecer.
configure({ asyncUtilTimeout: 4000 })

// Sem `globals`, o Testing Library não limpa o DOM sozinho entre os testes.
afterEach(() => cleanup())
