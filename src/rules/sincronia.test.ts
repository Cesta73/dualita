// Garantisce che la funzione server usi lo stesso motore delle regole dell'app.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Motore delle regole condiviso con il server', () => {
  it('supabase/functions/_shared/rules è identico a src/rules (altrimenti: npm run sync:regole)', () => {
    const src = new URL('./', import.meta.url);
    const dst = new URL('../../supabase/functions/_shared/rules/', import.meta.url);
    const files = readdirSync(src).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).sort();
    expect(readdirSync(dst).sort()).toEqual(files);
    for (const f of files) {
      expect(readFileSync(new URL(f, dst), 'utf8'), f).toBe(readFileSync(new URL(f, src), 'utf8'));
    }
  });
});
