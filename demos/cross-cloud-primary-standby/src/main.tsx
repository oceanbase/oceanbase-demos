import { createRoot } from 'react-dom/client'
import { IntlProvider } from './context/IntlContext'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <IntlProvider>
    <App />
  </IntlProvider>
)
