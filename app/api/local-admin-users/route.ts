import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hashPassword } from '@/lib/local-auth'

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

async function requireMaster() {
  const current = await getCurrentUser()
  if (!current) return null
  const master = await prisma.master_admins.findFirst({
    where: { id: current.id, active: true },
    select: { id: true },
  })
  return master ? current : null
}

export async function POST(req: NextRequest) {
  try {
    const current = await requireMaster()
    if (!current) return json({ error: { message: 'Acesso negado' } }, 403)

    const body = await req.json()
    if (body.action !== 'upsertConsultoriaGestor') {
      return json({ error: { message: 'Ação inválida' } }, 400)
    }

    const consultoriaId = String(body.consultoriaId || '')
    const fullName = String(body.fullName || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!consultoriaId) return json({ error: { message: 'Consultoria inválida' } }, 400)
    if (!email) return json({ data: { skipped: true }, error: null })

    const existingGestor = await prisma.avaliadores.findFirst({
      where: { consultoria_id: consultoriaId, role: 'gestor' },
      orderBy: { created_at: 'asc' },
    })

    if (!existingGestor && !password) {
      return json({ data: { skipped: true }, error: null })
    }

    if (password && password.length < 6) {
      return json({ error: { message: 'Senha deve ter no mínimo 6 caracteres' } }, 400)
    }

    let authUser = existingGestor
      ? await prisma.auth_users.findUnique({ where: { id: existingGestor.id } })
      : await prisma.auth_users.findUnique({ where: { email } })

    if (authUser) {
      authUser = await prisma.auth_users.update({
        where: { id: authUser.id },
        data: {
          email,
          ...(password ? { password_hash: hashPassword(password) } : {}),
        },
      })
    } else {
      authUser = await prisma.auth_users.create({
        data: {
          ...(existingGestor ? { id: existingGestor.id } : {}),
          email,
          password_hash: hashPassword(password),
        },
      })
    }

    const gestorData = {
      consultoria_id: consultoriaId,
      full_name: fullName || email,
      email,
      role: 'gestor',
      active: true,
    }

    const gestor = existingGestor
      ? await prisma.avaliadores.update({
          where: { id: existingGestor.id },
          data: gestorData,
        })
      : await prisma.avaliadores.create({
          data: {
            id: authUser.id,
            ...gestorData,
          },
        })

    return json({ data: { user: { id: authUser.id, email: authUser.email }, gestor }, error: null })
  } catch (err: any) {
    const message = err.code === 'P2002'
      ? 'Este e-mail já está vinculado a outro usuário'
      : err.message || 'Erro ao salvar acesso'
    return json({ error: { message } }, 500)
  }
}
