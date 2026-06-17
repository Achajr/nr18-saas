import { NextRequest, NextResponse } from 'next/server'
import { normalizarDadosCnpj, onlyDigits } from '@/lib/cnpj'

export async function GET(_req: NextRequest, { params }: { params: { cnpj: string } }) {
  const cnpj = onlyDigits(params.cnpj)
  if (cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ inválido.' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: {
        accept: 'application/json',
        'user-agent': 'NR18Check/1.0 (sstglobal.eng.br)',
      },
      next: { revalidate: 60 * 60 * 24 * 30 },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'CNPJ não encontrado.' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(normalizarDadosCnpj(data))
  } catch {
    return NextResponse.json({ error: 'Erro ao consultar CNPJ.' }, { status: 502 })
  }
}
