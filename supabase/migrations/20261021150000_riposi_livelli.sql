-- Fase 5: riposi (SRD p.41), salita di livello (SRD p.42-43), bottino (SRD p.57, p.59).

-- Nuove voci nel registro: le mosse di pausa e i tiri sulle tabelle del bottino
alter table public.rolls drop constraint rolls_kind_check;
alter table public.rolls add constraint rolls_kind_check check (kind in ('azione', 'danno', 'morte', 'avversario', 'riposo', 'bottino'));

-- Riposo in corso (lo avvia e lo chiude il GM tramite la funzione "tira-dadi", che tira anche la Paura)
alter table public.game_tables
  add column rest_kind text check (rest_kind is null or rest_kind in ('breve', 'lungo')),
  add column rest_id uuid,
  -- SRD p.41: dopo tre riposi brevi di fila il successivo deve essere lungo
  add column short_rests_in_row integer not null default 0 check (short_rests_in_row between 0 and 3),
  -- Salita di livello: il GM indica il livello che il gruppo raggiunge (SRD p.42: tutti insieme)
  add column level_up_to integer check (level_up_to is null or level_up_to between 2 and 10);
grant update (level_up_to) on public.game_tables to authenticated;

-- Il giocatore ha già fatto le sue mosse di pausa in questo riposo
alter table public.table_members add column rest_done uuid;
