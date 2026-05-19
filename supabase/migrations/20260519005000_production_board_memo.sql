-- Ensure production board cards can store per-item notes.

alter table public.production_board_items
  add column if not exists memo text;
