import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: Request) {
  try {
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, name, logoUrl, active } = body

    if (id) {
      const updated = await prisma.consultoria.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(logoUrl !== undefined && { logoUrl }),
          ...(active !== undefined && { active })
        }
      })
      return NextResponse.json({ consultoria: updated })
    }

    const created = await prisma.consultoria.create({
      data: {
        name: name || 'Nova Consultoria',
        logoUrl: logoUrl || null,
        active: active ?? true
      }
    })

    return NextResponse.json({ consultoria: created })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
