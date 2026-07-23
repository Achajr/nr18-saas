import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const COOKIE_NAME = 'nr18_session'

function secret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'nr18-dev-secret-change-me'
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex')
  return `pbkdf2_sha256$120000$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string) {
  const [algo, iterations, salt, hash] = stored.split('$')
  if (algo !== 'pbkdf2_sha256' || !iterations || !salt || !hash) return false
  const candidate = crypto.pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'))
}

export function createSessionToken(userId: string, email: string) {
  const payload = base64url(JSON.stringify({
    sub: userId,
    email,
    iat: Date.now(),
  }))
  return `${payload}.${sign(payload)}`
}

export function readSessionToken(token?: string) {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature || sign(payload) !== signature) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub: string; email: string }
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const token = cookies().get(COOKIE_NAME)?.value
  const session = readSessionToken(token)
  if (!session?.sub) return null
  const user = await prisma.auth_users.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, created_at: true },
  })
  return user ? { id: user.id, email: user.email, created_at: user.created_at } : null
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export { COOKIE_NAME }
