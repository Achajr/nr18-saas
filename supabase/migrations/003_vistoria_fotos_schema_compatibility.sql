-- Compatibilidade da tabela de fotos com o modelo atual do sistema.
-- O app atual usa consultorias; bancos antigos ainda podem exigir organization_id
-- vinculado à tabela legada organizations, o que bloqueia anexos de fotos.

alter table if exists public.vistoria_fotos
  alter column organization_id drop not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.vistoria_fotos'::regclass
      and contype = 'f'
      and conname like '%organization_id%'
  loop
    execute format('alter table public.vistoria_fotos drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table if exists public.vistoria_fotos
  add column if not exists vistoria_item_id uuid,
  add column if not exists item_id uuid,
  add column if not exists filename text,
  add column if not exists mime_type text,
  add column if not exists tipo text default 'nc';

comment on column public.vistoria_fotos.organization_id is 'Campo legado. Mantido opcional para compatibilidade; o vínculo operacional atual é por vistoria_id e item/vistoria_item_id.';
comment on column public.vistoria_fotos.vistoria_item_id is 'Item avaliado ao qual a foto está vinculada.';
comment on column public.vistoria_fotos.item_id is 'Alias compatível para o item avaliado usado por versões anteriores do app.';
