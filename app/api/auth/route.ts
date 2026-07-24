import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: Request) {
  try {
    const { action, email, password, fullName, consultoriaId } = await req.json()

    if (action === 'login') {
      const user = await prisma.authUser.findUnique({
        where: { email },
        include: { avaliador: true }
      })

      if (!user) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
      }

      const isMaster = await prisma.masterAdmin.findUnique({ where: { email } })

      return NextResponse.json({
        user: { id: user.id, email: user.email },
        master: !!isMaster,
        avaliador: user.avaliador
      })
    }

    if (action === 'register') {
      const user = await prisma.authUser.create({
        data: {
          email,
          passwordHash: password, // Para ambiente interno/VPS
          avaliador: {
            create: {
              fullName: fullName || email.split('@')[0],
              email,
              consultoriaId: consultoriaId,
              role: 'gestor'
            }
          }
        },
        include: { avaliador: true }
      })

      return NextResponse.json({ user })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
