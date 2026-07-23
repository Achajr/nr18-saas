import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex')
  return `pbkdf2_sha256$120000$${salt}$${hash}`
}

const email = process.env.MASTER_EMAIL || 'master@nr18check.com'
const password = process.env.MASTER_PASSWORD || '123456'
const fullName = process.env.MASTER_NAME || 'Master Admin'

const user = await prisma.auth_users.upsert({
  where: { email },
  update: { password_hash: hashPassword(password) },
  create: { email, password_hash: hashPassword(password) },
})

await prisma.master_admins.upsert({
  where: { id: user.id },
  update: { full_name: fullName, email, active: true },
  create: { id: user.id, full_name: fullName, email, active: true },
})

console.log('Master criado/atualizado:')
console.log('E-mail:', email)
console.log('Senha:', password)

await prisma.$disconnect()
