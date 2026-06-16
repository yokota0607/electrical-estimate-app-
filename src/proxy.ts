import { NextRequest, NextResponse } from 'next/server'

const SECRET = process.env.AUTH_SECRET ?? 'dev-secret-please-change-in-production'

function fromB64u(str: string): ArrayBuffer {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const dot = token.lastIndexOf('.')
    if (dot < 0) return false
    const p = token.slice(0, dot)
    const s = token.slice(dot + 1)
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const valid = await crypto.subtle.verify('HMAC', key, fromB64u(s), new TextEncoder().encode(p))
    if (!valid) return false
    const data = JSON.parse(new TextDecoder().decode(fromB64u(p)))
    return Date.now() < data.exp
  } catch {
    return false
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Pass x-pathname to layout for conditional Navigation rendering
  const reqHeaders = new Headers(req.headers)
  reqHeaders.set('x-pathname', pathname)

  const isLoginPage = pathname === '/login'
  const isAuthApi = pathname.startsWith('/api/auth/')
  const isPublic = isLoginPage || isAuthApi

  const token = req.cookies.get('session')?.value
  const authenticated = token ? await verifyToken(token) : false

  // Authenticated user hitting login page → redirect home
  if (isLoginPage && authenticated) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Unauthenticated on protected route
  if (!isPublic && !authenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next({ request: { headers: reqHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
