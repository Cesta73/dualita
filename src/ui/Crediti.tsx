// Pagina "Crediti e licenza": attribuzione richiesta dalla Darrington Press Community Gaming License
// (DPCGL 2.0, sezioni 4.1 e 4.3; copia in docs/licenza/).
import { Link } from 'react-router-dom';

export default function Crediti() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 leading-relaxed">
      <Link to="/" className="text-sm text-tenue underline hover:text-testo">← Indietro</Link>
      <h1 className="mt-4 font-titolo text-3xl">Crediti e licenza</h1>

      <section className="mt-4 rounded-xl border border-bordo bg-superficie p-4 text-sm" lang="en">
        <p>
          This product includes materials from the Daggerheart System Reference Document 1.0, © Critical Role, LLC.
          All rights reserved. Used under the terms of the Darrington Press Community Gaming (DPCGL) License.
          More information can be found at{' '}
          <a className="underline" href="https://www.daggerheart.com" target="_blank" rel="noreferrer">https://www.daggerheart.com</a>.
        </p>
        <p className="mt-2">
          Public Game Content: <a className="underline" href="https://www.daggerheart.com/srd" target="_blank" rel="noreferrer">https://www.daggerheart.com/srd</a>.
          License: <a className="underline" href="https://www.darringtonpress.com/license" target="_blank" rel="noreferrer">https://www.darringtonpress.com/license</a>.
        </p>
        <p className="mt-2">
          The Public Game Content has been modified by the author of this app: translated into Italian and adapted
          into an interactive tool. There are no previous modifications by others.
        </p>
      </section>

      <p className="mt-4">
        In italiano: questa app usa materiale del <em>Daggerheart System Reference Document 1.0</em>, creato da
        Darrington Press / Critical Role, LLC, con licenza <strong>Darrington Press Community Gaming License</strong>.
        Il materiale è stato tradotto in italiano e adattato per l'app.
      </p>
      <p className="mt-4 text-sm text-tenue">
        App non ufficiale realizzata da fan: non è approvata né sponsorizzata da Darrington Press o Critical Role.
        Traduzione italiana non ufficiale. Daggerheart™ è un marchio di Critical Role, LLC.
      </p>
    </main>
  );
}
