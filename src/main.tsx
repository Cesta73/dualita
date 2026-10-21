import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './ui/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// App installabile (PWA): il service worker si registra solo nella versione pubblicata
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* senza service worker l'app funziona lo stesso */ });
  });
}

// Chiede al browser di non cancellare da solo i dati dell'app (es. la chiave che riconosce l'utente)
navigator.storage?.persist?.().catch(() => { /* non supportato: resta il codice di recupero */ });
