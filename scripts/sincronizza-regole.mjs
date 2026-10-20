// Copia il motore delle regole (src/rules) nella cartella delle funzioni server di Supabase,
// così server e app usano esattamente lo stesso codice. Uso: npm run sync:regole
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

const src = new URL('../src/rules/', import.meta.url);
const dst = new URL('../supabase/functions/_shared/rules/', import.meta.url);
rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });
for (const f of readdirSync(src)) {
  if (f.endsWith('.ts') && !f.endsWith('.test.ts')) cpSync(new URL(f, src), new URL(f, dst));
}
console.log('Regole copiate in supabase/functions/_shared/rules/');
