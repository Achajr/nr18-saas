import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getSessionUserIdFromRequest } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'

const MAX_LOGO_SIZE = 3 * 1024 * 1024

class RequestError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message)
  }
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNullableString(value: unknown) {
  const text = asString(value)
  return text || null
}

function asBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true'
  return fallback
}

async function parseBody(req: Request) {
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return { body: await req.json(), logo: null as File | null }
  }

  const form = await req.formData()
  const body: Record<string, string> = {}
  form.forEach((value, key) => {
    if (typeof value === 'string') body[key] = value
  })

  const logo = form.get('logo')
  return { body, logo: logo instanceof File && logo.size > 0 ? logo : null }
}

async function saveLogo(file: File | null, consultoriaId: string, previousLogo?: string | null) {
  if (!file) return null
  if (!file.type.startsWith('image/')) throw new RequestError('A logomarca deve ser uma imagem')
  if (file.size > MAX_LOGO_SIZE) throw new RequestError('A logomarca deve ter no máximo 3MB')

  const extension = safeSegment((file.name.split('.').pop() || 'png').slice(0, 12))
  const dir = path.join(process.cwd(), 'public', 'uploads', 'consultorias', safeSegment(consultoriaId))
  await mkdir(dir, { recursive: true })

  const filename = `${Date.now()}-${randomUUID()}.${extension}`
  const storagePath = `/uploads/consultorias/${safeSegment(consultoriaId)}/${filename}`
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()))

  if (previousLogo?.startsWith('/uploads/consultorias/')) {
    await unlink(path.join(process.cwd(), 'public', previousLogo)).catch(() => undefined)
  }

  return storagePath
}

async function createGestorAccess(tx: Prisma.TransactionClient, consultoriaId: string, body: Record<string, unknown>, now: Date) {
  const loginEmail = asString(body.login_email || body.responsavel_email || body.email).toLowerCase()
  const loginPassword = asString(body.login_password)
  const fullName = asString(body.responsavel_nome || body.name)

  if (!loginEmail || !loginPassword) throw new RequestError('Login e senha da consultoria são obrigatórios')
  if (loginPassword.length < 6) throw new RequestError('A senha da consultoria deve ter no mínimo 6 caracteres')

  const existing = await tx.authUser.findUnique({ where: { email: loginEmail } })
  if (existing) throw new RequestError('Este e-mail de login já está cadastrado', 409)

  const user = await tx.authUser.create({
    data: { email: loginEmail, passwordHash: hashPassword(loginPassword) },
  })

  await tx.avaliador.create({
    data: {
      id: user.id,
      consultoriaId,
      fullName: fullName || loginEmail,
      email: loginEmail,
      role: 'gestor',
      active: asBoolean(body.active, true),
      updated_at: now,
    },
  })
}

async function updateGestorAccess(tx: Prisma.TransactionClient, consultoriaId: string, body: Record<string, unknown>, now: Date) {
  const loginEmail = asString(body.login_email).toLowerCase()
  const loginPassword = asString(body.login_password)
  const fullName = asString(body.responsavel_nome || body.name)

  if (!loginEmail && !loginPassword && !fullName && body.active === undefined) return

  const gestor = await tx.avaliador.findFirst({ where: { consultoriaId, role: 'gestor' } })
  if (!gestor) {
    if (!loginEmail && !loginPassword) return
    if (!loginEmail || !loginPassword) throw new RequestError('Informe login e senha para criar o acesso da consultoria')
    await createGestorAccess(tx, consultoriaId, body, now)
    return
  }

  if (loginPassword && loginPassword.length < 6) {
    throw new RequestError('A senha da consultoria deve ter no mínimo 6 caracteres')
  }

  if (loginEmail && loginEmail !== gestor.email) {
    const existing = await tx.authUser.findUnique({ where: { email: loginEmail } })
    if (existing && existing.id !== gestor.id) throw new RequestError('Este e-mail de login já está cadastrado', 409)
  }

  if (loginEmail || loginPassword) {
    await tx.authUser.update({
      where: { id: gestor.id },
      data: {
        ...(loginEmail && { email: loginEmail }),
        ...(loginPassword && { passwordHash: hashPassword(loginPassword) }),
      },
    })
  }

  await tx.avaliador.update({
    where: { id: gestor.id },
    data: {
      ...(loginEmail && { email: loginEmail }),
      ...(fullName && { fullName }),
      ...(body.active !== undefined && { active: asBoolean(body.active, true) }),
      updated_at: now,
    },
  })
}

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
      const consultoria = await prisma.consultoria.findUnique({ where: { id } })
      const gestor = consultoria
        ? await prisma.avaliador.findFirst({ where: { consultoriaId: consultoria.id, role: 'gestor' } })
        : null
      return NextResponse.json({ consultoria: consultoria ? { ...consultoria, login_email: gestor?.email || null } : null })
    }

    const consultorias = await prisma.consultoria.findMany({ orderBy: { createdAt: 'desc' } })
    const gestores = await prisma.avaliador.findMany({
      where: { role: 'gestor', consultoriaId: { in: consultorias.map(consultoria => consultoria.id) } },
      select: { consultoriaId: true, email: true },
    })
    const gestorByConsultoria = new Map(gestores.map(gestor => [gestor.consultoriaId, gestor.email]))

    return NextResponse.json({
      consultorias: consultorias.map(consultoria => ({
        ...consultoria,
        login_email: gestorByConsultoria.get(consultoria.id) || null,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao carregar consultorias' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const master = await requireMaster(req)
    if (!master) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })

    const { body, logo } = await parseBody(req)
    const { id, name, active } = body
    const now = new Date()
    const cleanName = asString(name)

    if (id) {
      const current = await prisma.consultoria.findUnique({ where: { id } })
      if (!current) return NextResponse.json({ error: 'Consultoria não encontrada' }, { status: 404 })
      const logoUrl = await saveLogo(logo, id, current.logoUrl)
      const updated = await prisma.consultoria.update({
        where: { id },
        data: {
          ...(cleanName && { name: cleanName }),
          ...(body.cnpj !== undefined && { cnpj: asNullableString(body.cnpj) }),
          ...(body.email !== undefined && { email: asNullableString(body.email) }),
          ...(body.phone !== undefined && { phone: asNullableString(body.phone) }),
          ...(body.endereco !== undefined && { endereco: asNullableString(body.endereco) }),
          ...(body.cidade !== undefined && { cidade: asNullableString(body.cidade) }),
          ...(body.uf !== undefined && { uf: asNullableString(body.uf) }),
          ...(body.cep !== undefined && { cep: asNullableString(body.cep) }),
          ...(body.responsavel_nome !== undefined && { responsavel_nome: asNullableString(body.responsavel_nome) }),
          ...(body.responsavel_email !== undefined && { responsavel_email: asNullableString(body.responsavel_email) }),
          ...(body.plan !== undefined && { plan: body.plan || 'pro' }),
          ...(body.max_avaliadores !== undefined && { max_avaliadores: Number(body.max_avaliadores) || 5 }),
          ...(body.max_empresas !== undefined && { max_empresas: Number(body.max_empresas) || 30 }),
          ...(body.max_obras !== undefined && { max_obras: Number(body.max_obras) || 999 }),
          ...(logoUrl && { logoUrl, logo_path: logoUrl }),
          ...(active !== undefined && { active: asBoolean(active, true) }),
          updated_at: now,
        }
      })
      await prisma.$transaction(tx => updateGestorAccess(tx, id, body, now))
      return NextResponse.json({ consultoria: updated })
    }

    const consultoriaId = randomUUID()
    const logoUrl = await saveLogo(logo, consultoriaId)
    const created = await prisma.$transaction(async tx => {
      const consultoria = await tx.consultoria.create({
        data: {
          id: consultoriaId,
          name: cleanName || 'Nova Consultoria',
          cnpj: asNullableString(body.cnpj),
          email: asNullableString(body.email),
          phone: asNullableString(body.phone),
          endereco: asNullableString(body.endereco),
          cidade: asNullableString(body.cidade),
          uf: asNullableString(body.uf),
          cep: asNullableString(body.cep),
          responsavel_nome: asNullableString(body.responsavel_nome),
          responsavel_email: asNullableString(body.responsavel_email),
          plan: body.plan || 'pro',
          max_avaliadores: Number(body.max_avaliadores) || 5,
          max_empresas: Number(body.max_empresas) || 30,
          max_obras: Number(body.max_obras) || 999,
          logoUrl,
          logo_path: logoUrl,
          active: asBoolean(active, true),
          created_by: master.id,
          updated_at: now,
        }
      })
      await createGestorAccess(tx, consultoria.id, body, now)
      return consultoria
    })

    return NextResponse.json({ consultoria: created })
  } catch (err) {
    if (err instanceof RequestError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Erro interno ao salvar consultoria' }, { status: 500 })
  }
}
