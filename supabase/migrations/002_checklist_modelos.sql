-- Checklist personalizado por consultoria
-- Aplique no Supabase SQL Editor para compartilhar os checklists editados entre todos os usuarios.

create table if not exists public.checklist_modelos (
  id uuid primary key default gen_random_uuid(),
  consultoria_id uuid not null references public.consultorias(id) on delete cascade,
  nome text not null default 'Checklist NR-18 personalizado',
  ativo boolean not null default true,
  blocos jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checklist_modelos_consultoria_idx
  on public.checklist_modelos (consultoria_id, ativo, updated_at desc);

alter table public.checklist_modelos enable row level security;

drop policy if exists "Gestores leem checklist da consultoria" on public.checklist_modelos;
create policy "Gestores leem checklist da consultoria"
on public.checklist_modelos for select
using (
  exists (
    select 1
    from public.avaliadores a
    where a.id = auth.uid()
      and a.consultoria_id = checklist_modelos.consultoria_id
  )
);

drop policy if exists "Gestores editam checklist da consultoria" on public.checklist_modelos;
create policy "Gestores editam checklist da consultoria"
on public.checklist_modelos for all
using (
  exists (
    select 1
    from public.avaliadores a
    where a.id = auth.uid()
      and a.role = 'gestor'
      and a.consultoria_id = checklist_modelos.consultoria_id
  )
)
with check (
  exists (
    select 1
    from public.avaliadores a
    where a.id = auth.uid()
      and a.role = 'gestor'
      and a.consultoria_id = checklist_modelos.consultoria_id
  )
);
