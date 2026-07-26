#!/usr/bin/env node

import fs from 'node:fs'
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {}

  return Object.fromEntries(
    fs.readFileSync(path, 'utf8')
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        const key = line.slice(0, index)
        const value = line.slice(index + 1).replace(/^['"]|['"]$/g, '')
        return [key, value]
      })
  )
}

function parseArgs() {
  const args = {}
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith('--')) continue
    const [key, ...rest] = arg.slice(2).split('=')
    args[key] = rest.join('=')
  }
  return args
}

function requireArg(args, key) {
  if (!args[key]) {
    throw new Error(`Informe --${key}=...`)
  }
  return args[key]
}

function hashPassword(password) {
  const iterations = 210_000
  const salt = randomBytes(16).toString('base64url')
  const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url')
  return `pbkdf2$${iterations}$${salt}$${hash}`
}

async function upsertUser(prisma, { email, password }) {
  const existing = await prisma.authUser.findUnique({ where: { email } })
  if (existing) {
    return prisma.authUser.update({
      where: { id: existing.id },
      data: { passwordHash: hashPassword(password) },
    })
  }

  return prisma.authUser.create({
    data: { email, passwordHash: hashPassword(password) },
  })
}

async function upsertMaster(prisma, user, name) {
  const existing = await prisma.masterAdmin.findFirst({ where: { email: user.email } })
  if (existing) {
    return prisma.masterAdmin.update({
      where: { id: existing.id },
      data: { fullName: name, active: true },
    })
  }

  return prisma.masterAdmin.create({
    data: {
      id: user.id,
      fullName: name,
      email: user.email,
      active: true,
    },
  })
}

async function ensureConsultoria(prisma, name, userId) {
  const existing = await prisma.consultoria.findFirst({ where: { name } })
  if (existing) return existing.id

  const consultoria = await prisma.consultoria.create({
    data: {
      name,
      plan: 'enterprise',
      max_avaliadores: 9999,
      max_empresas: 9999,
      max_obras: 9999,
      active: true,
      created_by: userId,
      updated_at: new Date(),
    },
  })
  return consultoria.id
}

async function upsertAvaliador(prisma, user, { name, role, consultoria }) {
  const consultoriaId = await ensureConsultoria(prisma, consultoria, user.id)
  const existing = await prisma.avaliador.findUnique({ where: { id: user.id } })
  const data = {
    consultoriaId,
    fullName: name,
    email: user.email,
    role,
    active: true,
    updated_at: new Date(),
  }

  if (existing) {
    return prisma.avaliador.update({ where: { id: user.id }, data })
  }

  return prisma.avaliador.create({
    data: { id: user.id, ...data },
  })
}

async function main() {
  const fileEnv = readEnvFile('.env.local')
  const env = { ...fileEnv, ...readEnvFile('.env'), ...process.env }
  const args = parseArgs()

  const email = requireArg(args, 'email')
  const password = requireArg(args, 'password')
  const name = args.name || 'Administrador'
  const role = args.role || 'master'
  const consultoria = args.consultoria || 'Consultoria Principal'

  if (!env.DATABASE_URL) throw new Error('DATABASE_URL nao encontrado em .env/.env.local')
  if (!['master', 'gestor', 'avaliador'].includes(role)) {
    throw new Error('--role deve ser master, gestor ou avaliador')
  }

  process.env.DATABASE_URL = env.DATABASE_URL
  const prisma = new PrismaClient()

  try {
    const user = await upsertUser(prisma, { email, password })

    if (role === 'master') {
      await upsertMaster(prisma, user, name)
    } else {
      await upsertAvaliador(prisma, user, { name, role, consultoria })
    }

    console.log(`Acesso pronto: ${email} (${role})`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
