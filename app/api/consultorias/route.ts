import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'

async function requireMaster(req: Request) {
  const userId = getSessionUserIdFromRequest(req)
  if (!userId) return null
  const user = await prisma.authUser.findUnique({ where: { id: userId } })
  if (!user) return null
  return prisma.masterAdmin.findFirst({ where: { email: user.email, active: true } })
}

export async function GET(req: Request) {
  try {
    const master = await requireMaster(req)
    if (!master) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const consultoria = await prisma.consultoria.findUnique({
        where: { id }
      })
      return NextResponse.json({ consultoria })
    }

    const consultorias = await prisma.consultoria.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ consultorias })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar consultorias' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const master = await requireMaster(req)
    if (!master) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })

    const body = await req.json()
    const { id, name, logoUrl, active } = body
    const now = new Date()

    if (id) {
      const updated = await prisma.consultoria.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(body.cnpj !== undefined && { cnpj: body.cnpj || null }),
          ...(body.email !== undefined && { email: body.email || null }),
          ...(body.phone !== undefined && { phone: body.phone || null }),
          ...(body.endereco !== undefined && { endereco: body.endereco || null }),
          ...(body.cidade !== undefined && { cidade: body.cidade || null }),
          ...(body.uf !== undefined && { uf: body.uf || null }),
          ...(body.cep !== undefined && { cep: body.cep || null }),
          ...(body.responsavel_nome !== undefined && { responsavel_nome: body.responsavel_nome || null }),
          ...(body.responsavel_email !== undefined && { responsavel_email: body.responsavel_email || null }),
          ...(body.plan !== undefined && { plan: body.plan || 'pro' }),
          ...(body.max_avaliadores !== undefined && { max_avaliadores: Number(body.max_avaliadores) || 5 }),
          ...(body.max_empresas !== undefined && { max_empresas: Number(body.max_empresas) || 30 }),
          ...(body.max_obras !== undefined && { max_obras: Number(body.max_obras) || 999 }),
          ...(logoUrl !== undefined && { logoUrl }),
          ...(active !== undefined && { active }),
          updated_at: now,
        }
      })
      return NextResponse.json({ consultoria: updated })
    }

    const created = await prisma.consultoria.create({
      data: {
        name: name || 'Nova Consultoria',
        cnpj: body.cnpj || null,
        email: body.email || null,
        phone: body.phone || null,
        endereco: body.endereco || null,
        cidade: body.cidade || null,
        uf: body.uf || null,
        cep: body.cep || null,
        responsavel_nome: body.responsavel_nome || null,
        responsavel_email: body.responsavel_email || null,
        plan: body.plan || 'pro',
        max_avaliadores: Number(body.max_avaliadores) || 5,
        max_empresas: Number(body.max_empresas) || 30,
        max_obras: Number(body.max_obras) || 999,
        logoUrl: logoUrl || null,
        active: active ?? true,
        created_by: master.id,
        updated_at: now,
      }
    })

    return NextResponse.json({ consultoria: created })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao salvar consultoria' }, { status: 500 })
  }
}
