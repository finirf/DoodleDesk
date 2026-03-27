-- Persist note/checklist grouping across reloads.
-- Safe to run multiple times.

alter table if exists public.notes
  add column if not exists group_id text;

alter table if exists public.checklists
  add column if not exists group_id text;

create index if not exists notes_desk_group_id_idx
  on public.notes (desk_id, group_id);

create index if not exists checklists_desk_group_id_idx
  on public.checklists (desk_id, group_id);
