-- DoodleDesk SQL Updates - 2026-04-02
-- Paste these commands into your Supabase SQL Editor in order

-- ============================================================
-- Note Edit Metadata for Shared Desk Labels
-- ============================================================
-- Stores the last editor for notes so collaborative desks can show
-- "Edited by ..." after a note is changed.

alter table public.notes
  add column if not exists edited_by_user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_notes_edited_by_user_id
  on public.notes(edited_by_user_id);

-- ============================================================
-- Done! Your database is now up to date.
-- ============================================================