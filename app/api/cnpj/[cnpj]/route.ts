import { NextRequest, NextResponse } from 'next/server'
import { normalizeCnpjInfo, onlyDigits, type BrasilApiCnpj } from '@/lib/cnpj'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROVIDERS = [
  { name: 'minhareceita', url: (cnpj: string) => `https://minhareceita.org/${cnpj}` },
  { name: 'brasilapi', url: (cnpj: string) => `https://brasilapi.com.br/api/cnpj/v1/${cnpj}` },
]

function scoreCnpjInfo(data: BrasilApiCnpj) {
  return [
    data.razao_social,
    data.nome_fantasia,
    data.email,
    data.ddd_telefone_1,
    data.cnae_fiscal,
    data.cep,
    data.logradouro,
    data.numero,
    data.bairro,
    data.municipio,
    data.uf,
    data.qsa?.length ? 'qsa' : '',
  ].filter(Boolean).length
}

async function fetchProvider(provider: (typeof PROVIDERS)[number], cnpj: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(provider.url(cnpj), {
      cache: 'no-store',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })

    if (!res.ok) throw new Error(`Consulta ${provider.name} falhou`)

    const data = normalizeCnpjInfo(await res.json())
    if (!data.razao_social) throw new Error(`Consulta ${provider.name} sem razão social`)

    return {
      provider: provider.name,
      data,
      score: scoreCnpjInfo(data),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { cnpj: string } },
) {
  const cnpj = onlyDigits(params.cnpj)

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
  }

  const results = await Promise.allSettled(
    PROVIDERS.map(provider => fetchProvider(provider, cnpj)),
  )

  const matches = results
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchProvider>>> => result.status === 'fulfilled')
    .map(result => result.value)
    .sort((a, b) => b.score - a.score)

  if (!matches.length) {
    return NextResponse.json({ error: 'CNPJ não encontrado' }, { status: 404 })
  }

  return NextResponse.json(matches[0].data)
}
