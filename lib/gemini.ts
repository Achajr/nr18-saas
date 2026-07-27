type GeminiGenerateOptions = {
  model: string
  prompt: string
  temperature: number
  maxOutputTokens: number
}

type GeminiResponsePart = {
  text?: string
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiResponsePart[]
    }
  }>
  error?: {
    message?: string
  }
}

export async function generateGeminiText({
  model,
  prompt,
  temperature,
  maxOutputTokens,
}: GeminiGenerateOptions) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no ambiente de produção.')
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
        },
      }),
    },
  )

  const json = (await res.json()) as GeminiResponse
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || 'Erro ao chamar Gemini')
  }

  const text = json.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('')
    .trim()

  if (!text) throw new Error('Gemini não retornou texto.')
  return text
}
