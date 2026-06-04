'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Camera, Trash2, Loader2, CheckCircle2,
  XCircle, Minus, ChevronDown, ChevronUp, Sparkles,
  FileText, Save, AlertTriangle
} from 'lucide-react'

const CHECKLIST_NR18 = [
  { codigo: '18.3', nome: 'Áreas de Vivência', itens: [
    { codigo: '18.3.1', descricao: 'Instalações sanitárias separadas por sexo (1 vaso/40 trabalhadores, 1 lavatório/20, 1 chuveiro/20)' },
    { codigo: '18.3.2', descricao: 'Vestiários com armários individuais para trabalhadores' },
    { codigo: '18.3.3', descricao: 'Local para refeições com assentos, mesas e proteção contra intempéries' },
    { codigo: '18.3.4', descricao: 'Alojamento com área mínima de 3m² por trabalhador, se houver pernoite' },
    { codigo: '18.3.5', descricao: 'Lavatórios próximos aos postos de trabalho (máximo 150m)' },
    { codigo: '18.3.6', descricao: 'Água potável disponível em todos os locais de trabalho' },
    { codigo: '18.3.7', descricao: 'Instalações sanitárias mantidas em condições de higiene e limpeza' },
  ]},
  { codigo: '18.4', nome: 'Instalações Elétricas', itens: [
    { codigo: '18.4.1', descricao: 'Quadros de distribuição identificados, aterrados e com proteção adequada' },
    { codigo: '18.4.2', descricao: 'Cabos e fiações sem emendas expostas, protegidos contra danos mecânicos' },
    { codigo: '18.4.3', descricao: 'Disjuntores termomagnéticos e DR instalados nos quadros' },
    { codigo: '18.4.4', descricao: 'Tomadas e plugues padronizados (NBR 14136) e em bom estado' },
    { codigo: '18.4.5', descricao: 'Iluminação adequada nos postos de trabalho (NBR ISO/CIE 8995-1)' },
    { codigo: '18.4.6', descricao: 'Distâncias de segurança mantidas de redes de alta tensão (NR-10)' },
    { codigo: '18.4.7', descricao: 'Trabalhadores autorizados e capacitados para serviços em instalações elétricas' },
  ]},
  { codigo: '18.5', nome: 'Máquinas, Equipamentos e Ferramentas', itens: [
    { codigo: '18.5.1', descricao: 'Máquinas com proteções nos pontos de transmissão (correias, engrenagens, polias)' },
    { codigo: '18.5.2', descricao: 'Betoneiras com proteção na cuba, engrenagens e botão de emergência' },
    { codigo: '18.5.3', descricao: 'Serra circular com proteção na lâmina (coifa), divisor de corte e empurrador' },
    { codigo: '18.5.4', descricao: 'Esmerilhadeira com protetor de disco e EPIs adequados no uso' },
    { codigo: '18.5.5', descricao: 'Ferramentas manuais em bom estado, sem cabos trincados ou gumes danificados' },
    { codigo: '18.5.6', descricao: 'Compressores com válvula de segurança, manômetro e PMTA visível' },
    { codigo: '18.5.7', descricao: 'Máquinas com identificação de riscos e manual disponível' },
    { codigo: '18.5.8', descricao: 'Manutenção preventiva com registros atualizados' },
  ]},
  { codigo: '18.6', nome: 'Transporte Vertical e Movimentação de Cargas', itens: [
    { codigo: '18.6.1', descricao: 'Elevadores de materiais com telas de proteção e fechamento nos andares' },
    { codigo: '18.6.2', descricao: 'Talhas e guindastes com carga máxima indicada e inspeção periódica' },
    { codigo: '18.6.3', descricao: 'Andaimes suspensos motorizados ou de balancim com travas de segurança' },
    { codigo: '18.6.4', descricao: 'Grua com operador habilitado, ART e inspeção periódica' },
    { codigo: '18.6.5', descricao: 'Área de movimentação de carga sinalizada e isolada de circulação de pessoas' },
    { codigo: '18.6.6', descricao: 'Cabos de aço e correntes em bom estado (sem kinks ou desgaste excessivo)' },
  ]},
  { codigo: '18.7', nome: 'Proteção Contra Queda', itens: [
    { codigo: '18.7.1', descricao: 'Guarda-corpos em aberturas de piso e bordas de laje (h mín. 1,20m, travessa a 0,70m, rodapé 0,20m)' },
    { codigo: '18.7.2', descricao: 'Telas de proteção nas fachadas a partir do 2º pavimento' },
    { codigo: '18.7.3', descricao: 'Plataformas de proteção (bandeja) nos andares (1ª a cada 3 pavimentos, demais a cada 2)' },
    { codigo: '18.7.4', descricao: 'Cinto de segurança tipo paraquedista com talabarte duplo em trabalhos em altura acima de 2m' },
    { codigo: '18.7.5', descricao: 'Linha de vida instalada e certificada para ancoragem dos cintos' },
    { codigo: '18.7.6', descricao: 'Escadas de acesso com corrimão bilateral' },
    { codigo: '18.7.7', descricao: 'Aberturas no piso tamponadas ou sinalizadas com proteção resistente' },
    { codigo: '18.7.8', descricao: 'PCMAT prevê e documenta as medidas de proteção coletiva contra quedas' },
  ]},
  { codigo: '18.8', nome: 'Escavações, Fundações e Desmonte de Rochas', itens: [
    { codigo: '18.8.1', descricao: 'Escavações acima de 1,25m com escoramento ou taludamento adequado' },
    { codigo: '18.8.2', descricao: 'Acesso a escavações por rampas ou escadas, nunca por degraus escavados' },
    { codigo: '18.8.3', descricao: 'Distância mínima de 1m da borda para depósito de material escavado' },
    { codigo: '18.8.4', descricao: 'Verificação de interferências com redes subterrâneas (elétrica, gás, água)' },
    { codigo: '18.8.5', descricao: 'Monitoramento do nível d água e rebaixamento quando necessário' },
  ]},
  { codigo: '18.9', nome: 'Estruturas de Concreto', itens: [
    { codigo: '18.9.1', descricao: 'Formas e escoramentos projetados e dimensionados por profissional habilitado' },
    { codigo: '18.9.2', descricao: 'Inspeção das formas antes das concretagens, com registro' },
    { codigo: '18.9.3', descricao: 'Cimbramento com ART e inspeções durante a cura do concreto' },
    { codigo: '18.9.4', descricao: 'Armações e telas de aço armazenadas de forma estável' },
    { codigo: '18.9.5', descricao: 'Pontas de ferragem com proteção (tampões ou dobradas) para evitar empalhamento' },
    { codigo: '18.9.6', descricao: 'Bomba de concreto com mangueiras e acessórios em bom estado e inspeção prévia' },
  ]},
  { codigo: '18.10', nome: 'Estruturas Metálicas', itens: [
    { codigo: '18.10.1', descricao: 'Montagem supervisionada por profissional habilitado com ART' },
    { codigo: '18.10.2', descricao: 'Trabalhadores com treinamento específico para montagem de estruturas metálicas' },
    { codigo: '18.10.3', descricao: 'Equipamentos de ancoragem e proteção contra quedas instalados antes da montagem' },
    { codigo: '18.10.4', descricao: 'Soldas realizadas por soldadores qualificados (FBTS/AWS)' },
    { codigo: '18.10.5', descricao: 'Proteções contra arco elétrico e radiação UV no posto de soldagem' },
  ]},
  { codigo: '18.11', nome: 'Andaimes e Plataformas de Trabalho', itens: [
    { codigo: '18.11.1', descricao: 'Andaimes fachadeiros com largura mínima de 0,80m e guarda-corpo completo' },
    { codigo: '18.11.2', descricao: 'Andaimes tubulares com travamentos diagonais e base nivelada' },
    { codigo: '18.11.3', descricao: 'Andaimes suspensos com inspeção diária e cabo-guia em bom estado' },
    { codigo: '18.11.4', descricao: 'Montagem de andaimes por trabalhadores treinados sob supervisão técnica' },
    { codigo: '18.11.5', descricao: 'Andaimes com carga máxima definida e respeitada' },
    { codigo: '18.11.6', descricao: 'Plataformas de madeira com tabuas sem nos, frestas max 2cm, fixadas corretamente' },
  ]},
  { codigo: '18.12', nome: 'Operações de Soldagem e Corte', itens: [
    { codigo: '18.12.1', descricao: 'Area de soldagem com ventilacao adequada ou exaustao local' },
    { codigo: '18.12.2', descricao: 'EPIs para soldagem: mascara com filtro, luvas, avental de raspa e perneiras' },
    { codigo: '18.12.3', descricao: 'Cilindros de gases comprimidos armazenados em local ventilado, fixados e protegidos' },
    { codigo: '18.12.4', descricao: 'Mangueiras e reguladores de pressao em bom estado, sem vazamentos' },
    { codigo: '18.12.5', descricao: 'Biombos de protecao para proteger trabalhadores proximos dos raios UV' },
  ]},
  { codigo: '18.13', nome: 'Trabalhos em Espaços Confinados', itens: [
    { codigo: '18.13.1', descricao: 'Espacos confinados identificados, sinalizados e com acesso controlado' },
    { codigo: '18.13.2', descricao: 'Analise de atmosfera (O2, gases toxicos e inflamaveis) antes da entrada' },
    { codigo: '18.13.3', descricao: 'Vigias treinados e posicionados externamente durante todo o trabalho' },
    { codigo: '18.13.4', descricao: 'Plano de resgate definido, testado e com equipamentos disponíveis' },
    { codigo: '18.13.5', descricao: 'Trabalhadores com treinamento especifico (NR-33) atualizado' },
  ]},
  { codigo: '18.14', nome: 'Sinalização de Segurança', itens: [
    { codigo: '18.14.1', descricao: 'Perimetro da obra com tapume ou cercamento em todo o entorno' },
    { codigo: '18.14.2', descricao: 'Placa de identificacao da obra com dados da empresa e responsavel tecnico' },
    { codigo: '18.14.3', descricao: 'Sinalizacao de proibicao, advertencia, obrigacao e emergencia nos locais pertinentes' },
    { codigo: '18.14.4', descricao: 'Rotas de fuga e saidas de emergencia sinalizadas e desobstruidas' },
    { codigo: '18.14.5', descricao: 'Sinalizacao noturna com dispositivos luminosos ou refletivos nas areas de risco' },
  ]},
  { codigo: '18.15', nome: 'Treinamentos e Capacitação', itens: [
    { codigo: '18.15.1', descricao: 'PCMAT elaborado e implementado (obras com 20 ou mais trabalhadores)' },
    { codigo: '18.15.2', descricao: 'SIPAT realizada anualmente conforme CIPA/NR-5' },
    { codigo: '18.15.3', descricao: 'Treinamento admissional em segurança do trabalho para todos os trabalhadores' },
    { codigo: '18.15.4', descricao: 'Treinamentos específicos para atividades de risco (altura, espaço confinado, elétrica)' },
    { codigo: '18.15.5', descricao: 'Registros de treinamentos com lista de presença e conteúdo programático arquivados' },
  ]},
  { codigo: '18.16', nome: 'EPI — Equipamentos de Proteção Individual', itens: [
    { codigo: '18.16.1', descricao: 'Capacete de proteção utilizado por todos na obra' },
    { codigo: '18.16.2', descricao: 'Calcado de seguranca (bota ou botina com biqueira) utilizado por todos' },
    { codigo: '18.16.3', descricao: 'EPIs fornecidos gratuitamente com CA do MTE valido e quantidade suficiente' },
    { codigo: '18.16.4', descricao: 'Fichas de controle de entrega de EPI assinadas pelos trabalhadores' },
    { codigo: '18.16.5', descricao: 'EPIs danificados substituídos e descartados adequadamente' },
    { codigo: '18.16.6', descricao: 'Proteção ocular e auditiva disponível nas atividades que geram poeira, fagulhas ou ruído' },
  ]},
  { codigo: '18.17', nome: 'Emergências e Primeiros Socorros', itens: [
    { codigo: '18.17.1', descricao: 'Extintores de incendio com carga valida, sinalizacao e acesso desobstruido' },
    { codigo: '18.17.2', descricao: 'Kit de primeiros socorros completo e acessivel' },
    { codigo: '18.17.3', descricao: 'Trabalhador(es) treinado(s) em primeiros socorros identificados na obra' },
    { codigo: '18.17.4', descricao: 'Plano de emergencia afixado em local visivel com contatos (SAMU, Bombeiros, hospital)' },
    { codigo: '18.17.5', descricao: 'Acesso para ambulancia garantido e desobstruido no canteiro' },
  ]},
]

type Resposta = 'C' | 'NC' | 'NA' | ''
interface ItemState {
  secao_codigo: string; secao_nome: string; item_codigo: string; item_descricao: string
  resposta: Resposta; observacao: string; db_id?: string; gerando_ia?: boolean
}
interface VistoriaInfo {
  id: string; numero: string; data_vistoria: string; status: string
  obra: { name: string; empresa_cliente: { name: string } | null } | null
}

export default function ChecklistPage() {
  const router = useRouter()
  const params = useParams()
  const vistoriaId = params.id as string
  const [vistoria, setVistoria] = useState<VistoriaInfo | null>(null)
  const [itens, setItens] = useState<ItemState[]>([])
  const [fotos, setFotos] = useState<Record<string, { url: string; file?: File; storage_path?: string; db_id?: string }[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [concluindo, setConcluindo] = useState(false)
  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fotoItemAlvo, setFotoItemAlvo] = useState<string | null>(null)

  useEffect(() => { initChecklist() }, [vistoriaId])

  async function initChecklist() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: v } = await supabase
        .from('vistorias')
        .select('id, numero, data_vistoria, status, obra:obras(name, empresa_cliente:empresas_clientes(name))')
        .eq('id', vistoriaId).single()
      if (!v) { toast.error('Vistoria não encontrada'); router.push('/dashboard'); return }
      setVistoria(v as any)
      setSecoesAbertas({ [CHECKLIST_NR18[0].codigo]: true })
      const estadoInicial: ItemState[] = CHECKLIST_NR18.flatMap(s =>
        s.itens.map(it => ({ secao_codigo: s.codigo, secao_nome: s.nome, item_codigo: it.codigo, item_descricao: it.descricao, resposta: '' as Resposta, observacao: '' }))
      )
      const { data: savedItens } = await supabase.from('vistoria_itens').select('*').eq('vistoria_id', vistoriaId)
      if (savedItens && savedItens.length > 0) {
        const mapa = Object.fromEntries(savedItens.map((si: any) => [si.item_codigo, si]))
        estadoInicial.forEach(it => { const s = mapa[it.item_codigo]; if (s) { it.resposta = (s.resposta || '') as Resposta; it.observacao = s.observacao || ''; it.db_id = s.id } })
      }
      setItens(estadoInicial)
      const { data: savedFotos } = await supabase.from('vistoria_fotos').select('id, url, storage_path, item:vistoria_itens(item_codigo)').eq('vistoria_id', vistoriaId)
      if (savedFotos) {
        const fotosMap: Record<string, any[]> = {}
        savedFotos.forEach((f: any) => { const c = f.item?.item_codigo; if (c) { if (!fotosMap[c]) fotosMap[c] = []; fotosMap[c].push({ url: f.url, storage_path: f.storage_path, db_id: f.id }) } })
        setFotos(fotosMap)
      }
    } catch (err) { console.error(err); toast.error('Erro ao carregar checklist') }
    finally { setLoading(false) }
  }

  function setResposta(item_codigo: string, resposta: Resposta) { setItens(prev => prev.map(it => it.item_codigo === item_codigo ? { ...it, resposta } : it)) }
  function setObservacao(item_codigo: string, obs: string) { setItens(prev => prev.map(it => it.item_codigo === item_codigo ? { ...it, observacao: obs } : it)) }
  function toggleSecao(codigo: string) { setSecoesAbertas(prev => ({ ...prev, [codigo]: !prev[codigo] })) }

  async function salvarChecklist() {
    setSaving(true)
    try {
      const respondidos = itens.filter(it => it.resposta !== '')
      if (respondidos.length === 0) { toast.error('Responda pelo menos um item'); setSaving(false); return }
      for (const it of respondidos) {
        if (it.db_id) {
          await supabase.from('vistoria_itens').update({ resposta: it.resposta, observacao: it.observacao || null }).eq('id', it.db_id)
        } else {
          const { data } = await supabase.from('vistoria_itens').insert({ vistoria_id: vistoriaId, secao_codigo: it.secao_codigo, secao_nome: it.secao_nome, item_codigo: it.item_codigo, item_descricao: it.item_descricao, resposta: it.resposta, observacao: it.observacao || null }).select('id').single()
          if (data) setItens(prev => prev.map(i => i.item_codigo === it.item_codigo ? { ...i, db_id: data.id } : i))
        }
      }
      toast.success('Progresso salvo!')
    } catch (err: any) { toast.error(err.message || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  function abrirCamera(item_codigo: string) { setFotoItemAlvo(item_codigo); fileInputRef.current?.click() }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || !fotoItemAlvo) return
    const item_codigo = fotoItemAlvo
    const it = itens.find(i => i.item_codigo === item_codigo)
    let item_db_id = it?.db_id
    if (!item_db_id) {
      const { data } = await supabase.from('vistoria_itens').insert({ vistoria_id: vistoriaId, secao_codigo: it!.secao_codigo, secao_nome: it!.secao_nome, item_codigo: it!.item_codigo, item_descricao: it!.item_descricao, resposta: it!.resposta || 'NC', observacao: it!.observacao || null }).select('id').single()
      if (data) { item_db_id = data.id; setItens(prev => prev.map(i => i.item_codigo === item_codigo ? { ...i, db_id: data.id, resposta: i.resposta || 'NC' } : i)) }
    }
    for (const file of Array.from(files)) {
      const tempUrl = URL.createObjectURL(file)
      setFotos(prev => ({ ...prev, [item_codigo]: [...(prev[item_codigo] || []), { url: tempUrl, file, uploading: true } as any] }))
      try {
        const ext = file.name.split('.').pop()
        const path = `vistorias/${vistoriaId}/${item_codigo}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('vistoria-fotos').upload(path, file, { contentType: file.type })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('vistoria-fotos').getPublicUrl(path)
        const publicUrl = urlData.publicUrl
        const { data: fotoData } = await supabase.from('vistoria_fotos').insert({ vistoria_id: vistoriaId, item_id: item_db_id, url: publicUrl, storage_path: path }).select('id').single()
        setFotos(prev => { const arr = [...(prev[item_codigo] || [])]; const idx = arr.findIndex(f => f.url === tempUrl); if (idx !== -1) arr[idx] = { url: publicUrl, storage_path: path, db_id: fotoData?.id }; return { ...prev, [item_codigo]: arr } })
      } catch (err) { console.error(err); toast.error('Erro ao enviar foto'); setFotos(prev => ({ ...prev, [item_codigo]: (prev[item_codigo] || []).filter(f => f.url !== tempUrl) })) }
    }
    e.target.value = ''
    setFotoItemAlvo(null)
  }

  async function removerFoto(item_codigo: string, url: string, db_id?: string, storage_path?: string) {
    if (db_id) await supabase.from('vistoria_fotos').delete().eq('id', db_id)
    if (storage_path) await supabase.storage.from('vistoria-fotos').remove([storage_path])
    setFotos(prev => ({ ...prev, [item_codigo]: (prev[item_codigo] || []).filter(f => f.url !== url) }))
  }

  async function gerarObservacaoIA(item_codigo: string) {
    const it = itens.find(i => i.item_codigo === item_codigo)
    if (!it || it.resposta !== 'NC') { toast.error('Selecione NC antes de usar a IA'); return }
    setItens(prev => prev.map(i => i.item_codigo === item_codigo ? { ...i, gerando_ia: true } : i))
    try {
      const empresa = vistoria?.obra?.empresa_cliente?.name || 'empresa'
      const obra = vistoria?.obra?.name || 'obra'
      const response = await fetch('/api/ia-observacao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_codigo, item_descricao: it.item_descricao, secao_nome: it.secao_nome, empresa, obra }) })
      const json = await response.json()
      if (json.observacao) { setObservacao(item_codigo, json.observacao); toast.success('Observação gerada!') }
    } catch (err) { toast.error('Erro ao gerar observação com IA') }
    finally { setItens(prev => prev.map(i => i.item_codigo === item_codigo ? { ...i, gerando_ia: false } : i)) }
  }

  async function concluirVistoria() {
    const respondidos = itens.filter(it => it.resposta !== '')
    if (respondidos.length === 0) { toast.error('Responda pelo menos um item'); return }
    const conformes = respondidos.filter(i => i.resposta === 'C').length
    const naoConformes = respondidos.filter(i => i.resposta === 'NC').length
    const na = respondidos.filter(i => i.resposta === 'NA').length
    const aplicaveis = respondidos.length - na
    const indice = aplicaveis > 0 ? Math.round((conformes / aplicaveis) * 100 * 100) / 100 : 100
    let classificacao = 'Critico'
    if (indice >= 90) classificacao = 'Satisfatorio'
    else if (indice >= 70) classificacao = 'Parcialmente satisfatorio'
    else if (indice >= 50) classificacao = 'Insatisfatorio'
    setConcluindo(true)
    try {
      await salvarChecklist()
      const { error } = await supabase.from('vistorias').update({ status: 'concluida', total_itens: respondidos.length, total_conformes: conformes, total_nao_conformes: naoConformes, total_na: na, indice_conformidade: indice, classificacao }).eq('id', vistoriaId)
      if (error) throw error
      toast.success('Vistoria concluida! Indice: ' + indice + '%')
      router.push('/dashboard/vistorias/' + vistoriaId + '/relatorio')
    } catch (err: any) { toast.error(err.message || 'Erro ao concluir vistoria') }
    finally { setConcluindo(false) }
  }

  const totalItens = itens.length
  const respondidos = itens.filter(i => i.resposta !== '').length
  const conformes = itens.filter(i => i.resposta === 'C').length
  const naoConformes = itens.filter(i => i.resposta === 'NC').length
  const progresso = totalItens > 0 ? Math.round((respondidos / totalItens) * 100) : 0

  if (loading) return <div className="min-h-screen bg-[#0f1117] flex items-center justify-center"><div className="w-10 h-10 border-2 border-[#185FA5] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-[#0f1117] pb-32">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFotoChange} />

      <header className="bg-[#16192a] border-b border-[#2a2d4a] px-4 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 text-slate-400 hover:text-white transition"><ArrowLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">Checklist NR-18 — {vistoria?.obra?.empresa_cliente?.name || vistoria?.obra?.name}</h1>
            <p className="text-xs text-slate-500">Vistoria {vistoria?.numero} · {vistoria?.data_vistoria ? new Date(vistoria.data_vistoria + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</p>
          </div>
          <button onClick={salvarChecklist} disabled={saving} className="p-2 text-slate-400 hover:text-[#185FA5] transition">{saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}</button>
        </div>
        <div className="max-w-2xl mx-auto mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">{respondidos}/{totalItens} itens</span>
            <div className="flex items-center gap-3 text-xs"><span className="text-green-400">{conformes} C</span><span className="text-red-400">{naoConformes} NC</span><span className="font-medium text-white">{progresso}%</span></div>
          </div>
          <div className="h-1.5 bg-[#2a2d4a] rounded-full overflow-hidden"><div className="h-full bg-[#185FA5] rounded-full transition-all duration-300" style={{ width: progresso + '%' }} /></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4">
        {CHECKLIST_NR18.map(secao => {
          const itensSecao = itens.filter(i => i.secao_codigo === secao.codigo)
          const respondidosSecao = itensSecao.filter(i => i.resposta !== '').length
          const ncSecao = itensSecao.filter(i => i.resposta === 'NC').length
          const aberta = secoesAbertas[secao.codigo]
          return (
            <div key={secao.codigo} className="mb-3 bg-[#16192a] border border-[#2a2d4a] rounded-2xl overflow-hidden">
              <button onClick={() => toggleSecao(secao.codigo)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-[#1a1d2e] transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="text-xs font-mono text-[#185FA5]">{secao.codigo}</span><span className="font-semibold text-white text-sm">{secao.nome}</span></div>
                  <div className="flex items-center gap-2 mt-0.5"><span className="text-xs text-slate-500">{respondidosSecao}/{itensSecao.length}</span>{ncSecao > 0 && <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={10} /> {ncSecao} NC</span>}</div>
                </div>
                <div className="flex items-center gap-2">{respondidosSecao === itensSecao.length && <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />}{aberta ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}</div>
              </button>
              {aberta && (
                <div className="border-t border-[#2a2d4a]">
                  {itensSecao.map((it, idx) => {
                    const fotosItem = fotos[it.item_codigo] || []
                    return (
                      <div key={it.item_codigo} className={'px-4 py-4' + (idx < itensSecao.length - 1 ? ' border-b border-[#2a2d4a]/50' : '')}>
                        <div className="flex gap-2 mb-3"><span className="text-xs font-mono text-slate-500 flex-shrink-0 mt-0.5">{it.item_codigo}</span><p className="text-sm text-slate-300 leading-relaxed">{it.item_descricao}</p></div>
                        <div className="flex gap-2 mb-3">
                          {(['C', 'NC', 'NA'] as const).map(r => (
                            <button key={r} onClick={() => setResposta(it.item_codigo, r)}
                              className={'flex-1 py-2.5 rounded-xl border text-sm font-bold transition ' + (it.resposta === r ? (r === 'C' ? 'border-green-500 bg-green-500/10 text-green-400' : r === 'NC' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-slate-500 bg-slate-500/10 text-slate-400') : 'border-[#2a2d4a] text-slate-500 hover:border-slate-500 hover:text-slate-300')}>
                              {r === 'C' ? '✓ C' : r === 'NC' ? '✗ NC' : '— NA'}
                            </button>
                          ))}
                        </div>
                        {it.resposta === 'NC' && (
                          <div className="space-y-2">
                            <div className="relative">
                              <textarea value={it.observacao} onChange={e => setObservacao(it.item_codigo, e.target.value)} placeholder="Descreva a não conformidade observada..." rows={3}
                                className="w-full px-3 py-2.5 pr-10 bg-[#0f1117] border border-[#2a2d4a] focus:border-red-500/50 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none transition resize-none" />
                              <button onClick={() => gerarObservacaoIA(it.item_codigo)} disabled={it.gerando_ia} title="Gerar com IA"
                                className="absolute right-2 top-2 p-1.5 text-slate-500 hover:text-[#185FA5] transition rounded-lg hover:bg-[#185FA5]/10">
                                {it.gerando_ia ? <Loader2 size={15} className="animate-spin text-[#185FA5]" /> : <Sparkles size={15} />}
                              </button>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {fotosItem.map((f, fi) => (
                                <div key={fi} className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#2a2d4a]">
                                  <img src={f.url} alt="" className="w-full h-full object-cover" />
                                  <button onClick={() => removerFoto(it.item_codigo, f.url, (f as any).db_id, f.storage_path)} className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-full"><Trash2 size={10} className="text-white" /></button>
                                </div>
                              ))}
                              <button onClick={() => abrirCamera(it.item_codigo)} className="w-20 h-20 border border-dashed border-[#2a2d4a] hover:border-[#185FA5]/50 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-[#185FA5] transition">
                                <Camera size={18} /><span className="text-xs">Foto</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-[#16192a] border-t border-[#2a2d4a] px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button onClick={salvarChecklist} disabled={saving} className="flex-1 py-3 border border-[#2a2d4a] text-slate-300 hover:text-white rounded-2xl text-sm font-medium transition flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
          </button>
          <button onClick={concluirVistoria} disabled={concluindo || respondidos === 0} className="flex-[2] py-3 bg-[#185FA5] hover:bg-[#1a6bbf] disabled:opacity-50 text-white rounded-2xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30">
            {concluindo ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Concluir e gerar relatório
          </button>
        </div>
      </div>
    </div>
  )
}