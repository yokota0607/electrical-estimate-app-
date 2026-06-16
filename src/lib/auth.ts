import { scryptSync, timingSafeEqual } from 'crypto'

const SECRET = process.env.AUTH_SECRET ?? 'dev-secret-please-change-in-production'

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    const input = scryptSync(password, salt, 64)
    return timingSafeEqual(Buffer.from(hash, 'hex'), input)
  } catch {
    return false
  }
}

// Base64url helpers (Web Crypto compatible — works in Node.js and Edge Runtime)
function toB64u(bytes: Uint8Array): string {
  let s = ''
  bytes.forEach(b => s += String.fromCharCode(b))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromB64u(str: string): ArrayBuffer {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function hmacKey(usage: KeyUsage[]) {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, usage
  )
}

export interface SessionUser {
  userId: number
  username: string
  displayName: string
  role: string
}

export async function createToken(user: SessionUser): Promise<string> {
  const payload = JSON.stringify({ ...user, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  const p = toB64u(new TextEncoder().encode(payload))
  const key = await hmacKey(['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(p))
  return `${p}.${toB64u(new Uint8Array(sig))}`
}

export async function parseToken(token: string): Promise<SessionUser | null> {
  try {
    const dot = token.lastIndexOf('.')
    if (dot < 0) return null
    const p = token.slice(0, dot)
    const s = token.slice(dot + 1)
    const key = await hmacKey(['verify'])
    const valid = await crypto.subtle.verify('HMAC', key, fromB64u(s), new TextEncoder().encode(p))
    if (!valid) return null
    const data = JSON.parse(new TextDecoder().decode(fromB64u(p)))
    if (Date.now() > data.exp) return null
    return { userId: data.userId, username: data.username, displayName: data.displayName, role: data.role }
  } catch {
    return null
  }
}
