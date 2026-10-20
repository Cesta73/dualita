// Accesso anonimo: niente email o password, il telefono ricorda la sessione.
import { supabase } from './supabase';

let pending: Promise<string> | null = null;

/** Restituisce l'id dell'utente, creando una sessione anonima se non esiste ancora. */
export function ensureSession(): Promise<string> {
  pending ??= (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session.user.id;
    const { data: signIn, error } = await supabase.auth.signInAnonymously();
    if (error || !signIn.user) {
      pending = null;
      throw new Error(error?.message ?? 'Accesso non riuscito');
    }
    return signIn.user.id;
  })();
  return pending;
}

const NAME_KEY = 'dh.nomeGiocatore';

/** Nome del giocatore ricordato sul dispositivo (comodità, non dato di gioco). */
export function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* archiviazione non disponibile: pazienza */
  }
}
