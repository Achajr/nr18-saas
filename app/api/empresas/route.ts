import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const consultoriaId = searchParams.get('consultoriaId')

    const where: any = { active: true }
    if (consultoriaId) where.consultoriaId = consultoriaId

    const empresas = await prisma.empresaCliente.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ empresas })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { consultoriaId, razaoSocial, nomeFantasia, cnpj } = await req.json()

    if (!consultoriaId || !razaoSocial) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    const empresa = await prisma.empresaCliente.create({
      data: {
        consultoriaId,
        razaoSocial,
        nomeFantasia,
        cnpj
      }
    })

    return NextResponse.json({ empresa })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

    await prisma.empresaCliente.update({
      where: { id },
      data: { active: false }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
