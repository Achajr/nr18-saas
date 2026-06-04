import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { item_codigo, item_descricao, secao_nome, empresa, obra } = await req.json()
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Você é um técnico de segurança do trabalho especialista em NR-18.\n\nEscreva uma observação técnica OBJETIVA e FORMAL (máximo 3 linhas) sobre uma não conformidade identificada durante vistoria.\n\nEmpresa: ${empresa}\nObra: ${obra}\nSeção: ${secao_nome}\nItem ${item_codigo}: ${item_descricao}\n\nA observação deve:\n- Descrever o que foi encontrado em não conformidade\n- Usar linguagem de relatório técnico (terceira pessoa)\n- Mencionar o item da NR-18\n- SEM markdown, SEM bullet points\n\nResponda APENAS com o texto da observação.`
      }]
    })
    const observacao = (message.content[0] as any).text?.trim() || ''
    return NextResponse.json({ observacao })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
