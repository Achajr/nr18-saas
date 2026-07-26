import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'

const HASH_PREFIX = 'pbkdf2'
const ITERATIONS = 210_000
const KEY_LENGTH = 32
const DIGEST = 'sha256'

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('base64url')
  return `${HASH_PREFIX}$${ITERATIONS}$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string) {
  if (!stored.startsWith(`${HASH_PREFIX}$`)) {
    return stored === password
  }

  const [, iterationsRaw, salt, hash] = stored.split('$')
  const iterations = Number(iterationsRaw)
  if (!iterations || !salt || !hash) return false

  const expected = Buffer.from(hash, 'base64url')
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, DIGEST)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function needsPasswordRehash(stored: string) {
  return !stored.startsWith(`${HASH_PREFIX}$`)
}
