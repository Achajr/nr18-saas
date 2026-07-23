-- Metadados técnicos do checklist NR-18
-- Campos opcionais para manter compatibilidade com vistorias antigas.

alter table if exists public.vistoria_itens
  add column if not exists item_etapa text,
  add column if not exists item_tipo_verificacao text,
  add column if not exists item_evidencias jsonb default '[]'::jsonb,
  add column if not exists item_aplicabilidade text,
  add column if not exists item_criterio text;

comment on column public.vistoria_itens.item_etapa is 'Etapa ou fase da obra em que o requisito normalmente se aplica.';
comment on column public.vistoria_itens.item_tipo_verificacao is 'Tipo de verificação: documental, campo ou documental_campo.';
comment on column public.vistoria_itens.item_evidencias is 'Lista de evidências esperadas para comprovação do requisito.';
comment on column public.vistoria_itens.item_aplicabilidade is 'Critério de aplicabilidade do item na obra/setor vistoriado.';
comment on column public.vistoria_itens.item_criterio is 'Critério técnico para julgamento de conformidade ou não conformidade.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vistoria_itens_item_etapa_check'
  ) then
    alter table public.vistoria_itens
      add constraint vistoria_itens_item_etapa_check
      check (
        item_etapa is null or item_etapa in (
          'documentacao',
          'implantacao',
          'fundacao',
          'estrutura',
          'acabamento',
          'cobertura',
          'movimentacao_cargas',
          'trabalho_altura',
          'todas'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'vistoria_itens_item_tipo_verificacao_check'
  ) then
    alter table public.vistoria_itens
      add constraint vistoria_itens_item_tipo_verificacao_check
      check (
        item_tipo_verificacao is null or item_tipo_verificacao in (
          'documental',
          'campo',
          'documental_campo'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'vistoria_itens_item_evidencias_array_check'
  ) then
    alter table public.vistoria_itens
      add constraint vistoria_itens_item_evidencias_array_check
      check (jsonb_typeof(item_evidencias) = 'array');
  end if;
end $$;
