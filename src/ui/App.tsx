// HashRouter: i link funzionano anche su GitHub Pages (es. .../#/tavolo/ABC234).
import { HashRouter, Route, Routes } from 'react-router-dom';
import Crediti from './Crediti';
import Home from './Home';
import Tavolo from './Tavolo';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tavolo/:code" element={<Tavolo />} />
        <Route path="/crediti" element={<Crediti />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </HashRouter>
  );
}
