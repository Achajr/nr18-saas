# Design System — NR18 SaaS

## Padrão visual validado

### Cores principais
- Background: #0f1117
- Card/Surface: #16192a
- Border: #2a2d4a
- Primary/Brand: #185FA5
- Primary hover: #1a6bbf
- Text primary: white
- Text secondary: slate-400/500
- Text muted: slate-600

### Status colors
- Conforme/OK: #3B6D11 / bg #EAF3DE
- Não conforme: #A32D2D / bg #FCEBEB
- Não aplicável: #888780 / bg #F1EFE8
- Pendente: #854F0B / bg #FAEEDA

### Input padrão
px-4 py-3 bg-[#0f1117] border border-[#2a2d4a] rounded-xl text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-[#185FA5] transition

### Botão primário
px-4 py-3 bg-[#185FA5] hover:bg-[#1a6bbf] text-white font-semibold rounded-xl transition

### Botão secundário
px-4 py-3 border border-[#2a2d4a] text-slate-400 hover:text-white rounded-xl transition

### Card
bg-[#16192a] border border-[#2a2d4a] rounded-2xl

### Header sticky
bg-[#16192a] border-b border-[#2a2d4a] px-4 py-4 sticky top-0 z-10

### Modal overlay
fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4

### Modal card
bg-[#16192a] border border-[#2a2d4a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto

### Bordas
- rounded-xl = inputs e botões
- rounded-2xl = cards, modais, containers

### Tipografia
- Título página: text-2xl font-bold text-white
- Título seção: text-lg font-semibold text-white
- Label: text-xs font-medium text-slate-400
- Body: text-sm text-white
- Muted: text-xs text-slate-500

### Badges padrão
- Plano free: bg-slate-700 text-slate-300
- Plano pro: bg-blue-900 text-blue-300
- Plano enterprise: bg-purple-900 text-purple-300
- Ativo: bg-green-900/40 text-green-400
- Inativo: bg-red-900/40 text-red-400
- Master Admin: bg-purple-900/50 text-purple-300 border border-purple-800

### NR 18 — níveis de risco
- Grave: bg-[#FCEBEB] text-[#791F1F]
- Alto: bg-[#FAEEDA] text-[#633806]
- Médio: bg-[#E6F1FB] text-[#0C447C]
- Baixo: bg-[#EAF3DE] text-[#27500A]

### Multas NR 28
- I1: bg-[#EAF3DE] text-[#27500A] — R$ 575 a R$ 2.781
- I2: bg-[#E6F1FB] text-[#0C447C] — R$ 2.653 a R$ 4.387
- I3: bg-[#FAEEDA] text-[#633806] — R$ 2.655 a R$ 4.387
- I4: bg-[#FCEBEB] text-[#791F1F] — R$ 4.387 a R$ 6.707

### Spinner / Loading
- Página: w-10 h-10 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin
- Inline: <Loader2 size={16} className="animate-spin" />

### Ícones
- Biblioteca: lucide-react
- Tamanho padrão: size={18} ou size={20}

### Padrão de página
1. Header sticky com ArrowLeft + título + subtítulo
2. main com max-w-2xl (mobile/avaliador) ou max-w-5xl/6xl (desktop/master/consultoria)
3. mx-auto px-4 py-6 (mobile) ou py-8 (desktop)
4. Cards com gap-3 ou gap-4
5. Modais com header sticky interno

## Telas já criadas e validadas

### Autenticação
- /auth/login — tela de login com redirect por role
- /auth/register — cadastro com CNPJ automático, registro MTE/CREA, estagiário sem registro

### Painel Master (/master)
- /master — dashboard com stats, lista consultorias, atalhos
- /master/consultorias — CRUD completo, busca CNPJ automática BrasilAPI, planos Free/Pro/Enterprise
- /master/avaliadores — CRUD completo, filtro por consultoria, registro MTE/CREA, funções

### Painel Consultoria (/consultoria)
- /consultoria — dashboard com stats, lista empresas, atalhos avaliadores/empresas
- /consultoria/empresas — CRUD completo, busca CNPJ+CEP automática, grau de risco, avaliador responsável

### Painel Avaliador (/dashboard)
- /dashboard — mobile-first, stats, botão nova vistoria em destaque, últimas vistorias
- /dashboard/obras/nova — fluxo 3 steps: selecionar empresa → selecionar/criar obra → dados da vistoria

## Próximas telas a criar
- /dashboard/vistorias/[id] — CHECKLIST NR 18 completo
- /dashboard/vistorias/[id]/relatorio — Relatório técnico com IA
- /consultoria/avaliadores — Gestão avaliadores pela consultoria
- /consultoria/relatorios — Todos os relatórios

## Stack técnica
- Next.js 14 App Router
- Supabase (PostgreSQL + Auth + Storage)
- Tailwind CSS
- lucide-react (ícones)
- @supabase/ssr (client)
- react-hot-toast (notificações)
- BrasilAPI (CNPJ + CEP automático)

## Hierarquia de usuários
1. Master Admin — tabela master_admins — acesso total — painel /master
2. Gestor (role=gestor) — tabela avaliadores — gerencia consultoria — painel /consultoria
3. Avaliador/TST/Engenheiro/Estagiário — tabela avaliadores — faz vistorias — painel /dashboard

## Banco de dados — tabelas principais
- master_admins (id, full_name, email)
- consultorias (id, name, cnpj, plan, max_avaliadores, max_empresas, active)
- avaliadores (id, consultoria_id, full_name, email, role, registro_mte, crea, active)
- empresas_clientes (id, consultoria_id, name, cnpj, cidade, uf, grau_risco, avaliador_responsavel)
- obras (id, consultoria_id, empresa_cliente_id, avaliador_id, name, etapa, status)
- vistorias (id, obra_id, consultoria_id, avaliador_id, numero, data_vistoria, status, indice_conformidade, classificacao)
- vistoria_itens (id, vistoria_id, item_id, bloco_id, status, observacao, item_nr_texto, item_multa)
- vistoria_fotos (id, vistoria_id, vistoria_item_id, storage_path, tipo)
- planos_acao (id, vistoria_id, titulo, responsavel, prazo, status)

## Observações importantes
- RLS desabilitado temporariamente em: avaliadores, empresas_clientes
- organization_id nas tabelas obras e vistorias é NOT NULL removido (usa consultoria_id)
- Supabase client usa @supabase/ssr createBrowserClient
- Redirecionamento pós-login usa window.location.href (não router.push) para garantir cookie
- BrasilAPI endpoint CNPJ: https://brasilapi.com.br/api/cnpj/v1/{cnpj}
- BrasilAPI endpoint CEP: https://brasilapi.com.br/api/cep/v1/{cep}