import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { item_codigo, item_descricao, secao_nome, empresa, obra, texto_avaliador, contexto } = await req.json()

    // Modo: reescrever observacao do avaliador (checklist)
    if (texto_avaliador) {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `Voce e um redator tecnico especialista em laudos de seguranca do trabalho (NR-18, Portaria MTE n. 836/2026).

Reescreva o texto abaixo em linguagem tecnica formal de relatorio de vistoria. NAO invente fatos novos. NAO adicione informacoes que nao estejam no texto original. Apenas aprimMore a redacao: corrija erros, use terceira pessoa, linguagem tecnica, mencione o item da NR-18 quando pertinente.

Empresa: ${empresa}
Obra: ${obra}
Item NR-18: ${item_codigo} — ${item_descricao}

Texto original do avaliador:
"${texto_avaliador}"

Regras:
- Mantenha APENAS os fatos descritos pelo avaliador
- Terceira pessoa (ex: "Constatou-se", "Verificou-se", "Foi identificado")
- Maximo 4 linhas
- SEM markdown, SEM asteriscos, SEM bullet points
- Cite o item da NR-18 (${item_codigo})

Responda APENAS com o texto reescrito.`
        }]
      })
      const observacao = (message.content[0] as any).text?.trim() || ''
      return NextResponse.json({ observacao })
    }

    // Modo: gerar parecer tecnico conclusivo do relatorio
    if (contexto) {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Voce e um engenheiro de seguranca do trabalho especialista em NR-18 (Portaria MTE n. 836, de 13 de maio de 2026).

Elabore um PARECER TECNICO CONCLUSIVO formal para relatorio de vistoria de seguranca.

Dados da vistoria:
Empresa: ${empresa}
Obra: ${obra}
${contexto}

O parecer deve:
- Ser dividido em paragrafos (sem titulos, sem bullets, sem markdown)
- Paragrafo 1: introducao com identificacao da obra, data e objetivo da vistoria
- Paragrafo 2: resultado geral com indice de conformidade e classificacao, citando a escala da NR-18
- Paragrafo 3: principais nao conformidades encontradas, citando os itens da NR-18 e os niveis de risco
- Paragrafo 4: recomendacoes objetivas priorizando as NCs graves, com prazos sugeridos
- Paragrafo 5: conclusao com posicionamento tecnico do responsavel
- Usar sempre PGR (nunca PCMAT — a NR-18/2026 substituiu o PCMAT pelo PGR)
- Linguagem tecnica formal, terceira pessoa
- Maximo 300 palavras

Responda APENAS com o texto do parecer.`
        }]
      })
      const observacao = (message.content[0] as any).text?.trim() || ''
      return NextResponse.json({ observacao })
    }

    return NextResponse.json({ error: 'Parametros insuficientes' }, { status: 400 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
