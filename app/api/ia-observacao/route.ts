import { NextRequest, NextResponse } from 'next/server'
import { generateGeminiText } from '@/lib/gemini'

const GEMINI_REESCRITA_MODEL = 'gemini-2.5-flash-lite'
const GEMINI_LAUDO_MODEL = 'gemini-2.5-flash'
const GEMINI_TEMPERATURE = 0.2
const REESCRITA_MAX_TOKENS = 500
const LAUDO_MAX_TOKENS = 1600

export async function POST(req: NextRequest) {
  try {
    const { item_codigo, item_descricao, empresa, obra, texto_avaliador, contexto } = await req.json()

    if (texto_avaliador) {
      const observacao = await generateGeminiText({
        model: GEMINI_REESCRITA_MODEL,
        temperature: GEMINI_TEMPERATURE,
        maxOutputTokens: REESCRITA_MAX_TOKENS,
        prompt: `Você é um redator técnico especialista em laudos de segurança do trabalho (NR-18, Portaria MTE nº 836/2026).

Reescreva o texto abaixo em linguagem técnica formal de relatório de vistoria. Não invente fatos novos. Não adicione informações que não estejam no texto original. Apenas aprimore a redação: corrija erros, use terceira pessoa, linguagem técnica e mencione o item da NR-18 quando pertinente.

Empresa: ${empresa}
Obra: ${obra}
Item NR-18: ${item_codigo} — ${item_descricao}

Texto original do avaliador:
"${texto_avaliador}"

Regras:
- Mantenha apenas os fatos descritos pelo avaliador.
- Use terceira pessoa, como "Constatou-se", "Verificou-se" ou "Foi identificado".
- Antes de responder, revise ortografia, acentuação, pontuação, concordância e gramática para não haver erros de português.
- Máximo de 4 linhas.
- Sem markdown, sem asteriscos e sem bullet points.
- Cite o item da NR-18 (${item_codigo}).

Responda apenas com o texto reescrito.`,
      })

      return NextResponse.json({ observacao })
    }

    if (contexto) {
      const observacao = await generateGeminiText({
        model: GEMINI_LAUDO_MODEL,
        temperature: GEMINI_TEMPERATURE,
        maxOutputTokens: LAUDO_MAX_TOKENS,
        prompt: `Você é um engenheiro de segurança do trabalho especialista em NR-18 (Portaria MTE nº 836, de 13 de maio de 2026).

Elabore um parecer técnico conclusivo formal para relatório de vistoria de segurança.

Dados da vistoria:
Empresa: ${empresa}
Obra: ${obra}
${contexto}

O parecer deve:
- Ser dividido em parágrafos, sem títulos, sem bullets e sem markdown.
- Parágrafo 1: introdução com identificação da obra, data e objetivo da vistoria.
- Parágrafo 2: resultado geral com índice de conformidade e classificação.
- Parágrafo 3: principais não conformidades encontradas, citando itens da NR-18 e níveis de risco.
- Parágrafo 4: recomendações objetivas, priorizando as não conformidades graves e prazos sugeridos.
- Parágrafo 5: conclusão com posicionamento técnico do responsável.
- Usar sempre PGR, nunca PCMAT.
- Usar linguagem técnica formal em terceira pessoa.
- Manter o texto proporcional ao tamanho do relatório, com objetividade.
- Antes de responder, revise ortografia, acentuação, pontuação, concordância e gramática para não haver erros de português.

Responda apenas com o texto do parecer.`,
      })

      return NextResponse.json({ observacao })
    }

    return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao chamar Gemini' }, { status: 500 })
  }
}
