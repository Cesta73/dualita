// HashRouter: i link funzionano anche su GitHub Pages (es. .../#/tavolo/ABC234).
// Le pagine si caricano solo quando servono, così l'app si apre prima sul telefono.
import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AvvisoRete } from './componenti/AvvisoRete';
import { Errore } from './componenti/Errore';
import Home from './Home';

const Tavolo = lazy(() => import('./Tavolo'));
const Crediti = lazy(() => import('./Crediti'));
const Guida = lazy(() => import('./Guida'));
const Creazione = lazy(() => import('./personaggio/Creazione'));
const ElencoPersonaggi = lazy(() => import('./personaggio/Personaggi').then((m) => ({ default: m.ElencoPersonaggi })));
const SchedaPersonaggio = lazy(() => import('./personaggio/Personaggi').then((m) => ({ default: m.SchedaPersonaggio })));

const Caricamento = () => <main className="p-8 text-center text-tenue" role="status">Carico…</main>;

export default function App() {
  return (
    <HashRouter>
      <AvvisoRete />
      <Errore>
        <Suspense fallback={<Caricamento />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tavolo/:code" element={<Tavolo />} />
            <Route path="/crediti" element={<Crediti />} />
            <Route path="/guida" element={<Guida />} />
            <Route path="/personaggi" element={<ElencoPersonaggi />} />
            <Route path="/personaggi/nuovo" element={<Creazione />} />
            <Route path="/personaggi/:id" element={<SchedaPersonaggio />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </Errore>
    </HashRouter>
  );
}
