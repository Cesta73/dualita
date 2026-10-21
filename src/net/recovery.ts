// Codice di recupero: ritrovare personaggi, tavoli e ruolo di GM su un altro dispositivo, senza email.
// Il codice lo genera il server; nel database ne resta solo l'impronta cifrata.
import { ensureSession } from './session';
import { supabase } from './supabase';

/** Data di creazione del codice (null = non ancora creato) */
export async function recoveryCodeCreatedAt(): Promise<string | null> {
  await ensureSession();
  const { data, error } = await supabase.rpc('recovery_code_created_at');
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}

/** Crea o rigenera il codice: viene mostrato una sola volta */
export async function createRecoveryCode(): Promise<string> {
  await ensureSession();
  const { data, error } = await supabase.rpc('create_recovery_code');
  if (error) throw new Error(error.message);
  return data as string;
}

/** Recupera tutto ciò che era legato al codice */
export async function recoverWithCode(code: string): Promise<{ personaggi: number; tavoli: number; gia_tuo: boolean }> {
  await ensureSession();
  const { data, error } = await supabase.rpc('recover_with_code', { p_code: code });
  if (error) throw new Error(error.message);
  return data as { personaggi: number; tavoli: number; gia_tuo: boolean };
}

/** Promemoria: true se su questo dispositivo c'è già un utente che non ha ancora creato il codice.
 *  Non crea un nuovo utente (a chi apre l'app la prima volta non serve). */
export async function needsRecoveryReminder(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  const { data: created, error } = await supabase.rpc('recovery_code_created_at');
  return !error && !created;
}
