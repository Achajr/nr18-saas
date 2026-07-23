-- Correção direta para bancos que ainda mantiveram o vínculo legado
-- vistoria_fotos.organization_id -> organizations.id.
-- O sistema atual trabalha por consultoria/vistoria/item; organization_id
-- deve permanecer apenas como campo legado opcional.

alter table if exists public.vistoria_fotos
  drop constraint if exists vistoria_fotos_organization_id_fkey;

alter table if exists public.vistoria_fotos
  alter column organization_id drop not null;

comment on column public.vistoria_fotos.organization_id is
  'Campo legado opcional. Não deve bloquear anexos de fotos no modelo atual por consultoria/vistoria/item.';
