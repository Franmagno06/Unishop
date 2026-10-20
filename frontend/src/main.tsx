import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/work-sans'
import '@fontsource/spectral/600.css'
import '@fontsource/spectral/700.css'
import './styles/index.css'
import App from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
