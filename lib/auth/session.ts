import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

export const AUTH_COOKIE = 'auth_session'
const LEGACY_AUTH_COOKIE = 'auth_user_id'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET precisa estar configurado em produção')
  }
  return secret || 'dev-only-auth-secret-change-me'
}

function sign(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url')
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function parseCookieHeader(header: string | null) {
  return Object.fromEntries(
    (header || '')
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const index = part.indexOf('=')
        if (index === -1) return [part, '']
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))]
      }),
  )
}

export function createSessionToken(userId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = `${userId}.${expiresAt}`
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return null
  const [userId, expiresRaw, signature] = token.split('.')
  if (!userId || !expiresRaw || !signature) return null

  const expiresAt = Number(expiresRaw)
  if (!expiresAt || expiresAt < Math.floor(Date.now() / 1000)) return null

  const payload = `${userId}.${expiresAt}`
  return safeEqual(sign(payload), signature) ? userId : null
}

export function getSessionUserIdFromRequest(req: Request) {
  const cookies = parseCookieHeader(req.headers.get('cookie'))
  const userId = verifySessionToken(cookies[AUTH_COOKIE])
  if (userId) return userId

  const legacyUserId = cookies[LEGACY_AUTH_COOKIE]
  return legacyUserId && !legacyUserId.includes('.') ? legacyUserId : null
}

export function setAuthCookies(response: NextResponse, userId: string) {
  response.cookies.set(AUTH_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
  response.cookies.set(LEGACY_AUTH_COOKIE, '', { expires: new Date(0), path: '/' })
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE, '', { expires: new Date(0), path: '/' })
  response.cookies.set(LEGACY_AUTH_COOKIE, '', { expires: new Date(0), path: '/' })
}
