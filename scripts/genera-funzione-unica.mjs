// Crea un file unico (motore delle regole + funzione tira-dadi) da incollare nell'editor
// delle Edge Functions del pannello Supabase. Uso: npm run funzione:unica
// Risultato: dist-funzione/tira-dadi.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const rules = ['dice.ts', 'resources.ts', 'actionRoll.ts', 'damage.ts', 'sheet.ts'];
const strip = (s) => s.replace(/^import .*?;\n/gm, '');
let body = '// File unico generato da scripts/genera-funzione-unica.mjs: NON modificarlo a mano.\n';
for (const f of rules) body += `\n// ─── rules/${f} ───\n` + strip(readFileSync(new URL(`../src/rules/${f}`, import.meta.url), 'utf8'));
const fn = readFileSync(new URL('../supabase/functions/tira-dadi/index.ts', import.meta.url), 'utf8');
const npmImports = fn.match(/^import .*npm:.*;\n/gm) ?? [];
body += '\n// ─── tira-dadi/index.ts ───\n' + strip(fn);
mkdirSync(new URL('../dist-funzione/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist-funzione/tira-dadi.ts', import.meta.url), npmImports.join('') + body);
console.log('Creato dist-funzione/tira-dadi.ts');
