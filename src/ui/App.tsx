// HashRouter: i link funzionano anche su GitHub Pages (es. .../#/tavolo/ABC234).
import { HashRouter, Route, Routes } from 'react-router-dom';
import Crediti from './Crediti';
import Guida from './Guida';
import Creazione from './personaggio/Creazione';
import { ElencoPersonaggi, SchedaPersonaggio } from './personaggio/Personaggi';
import Home from './Home';
import Tavolo from './Tavolo';

export default function App() {
  return (
    <HashRouter>
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
    </HashRouter>
  );
}
