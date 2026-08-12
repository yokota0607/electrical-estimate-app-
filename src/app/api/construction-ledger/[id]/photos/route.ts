export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseToken } from '@/lib/auth'
import sql from '@/lib/db'
import path from 'path'
import fs from 'fs/promises'

const PHASES = ['施工前', '施工中', '完了後']

async function saveToLocal(id: string, file: File): Promise<string> {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'construction', id, 'photos')
  await fs.mkdir(uploadDir, { recursive: true })
  const ext = path.extname(file.name)
  const base = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
  const storedName = `${base}_${Date.now()}${ext}`
  const filePath = path.join(uploadDir, storedName)
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)
  return `/uploads/construction/${id}/photos/${storedName}`
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rows = await sql`
      SELECT * FROM site_photos WHERE ledger_id = ${Number(id)} ORDER BY created_at ASC
    `
    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    const user = token ? await parseToken(token) : null

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: '写真が選択されていません' }, { status: 400 })
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '画像ファイルを選択してください' }, { status: 400 })
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'ファイルサイズは50MB以下にしてください' }, { status: 400 })
    }

    let storedUrl: string

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob')
      const blob = await put(`construction/${id}/photos/${file.name}`, file, {
        access: 'public',
        addRandomSuffix: true,
      })
      storedUrl = blob.url
    } else {
      storedUrl = await saveToLocal(id, file)
    }

    const phaseRaw = (formData.get('phase') as string) || '施工前'
    const phase = PHASES.includes(phaseRaw) ? phaseRaw : '施工前'
    const caption = (formData.get('caption') as string) || ''

    const [row] = await sql`
      INSERT INTO site_photos (ledger_id, stored_name, original_name, file_size, mime_type, uploaded_by, phase, caption)
      VALUES (${Number(id)}, ${storedUrl}, ${file.name}, ${file.size}, ${file.type || ''}, ${user?.displayName || ''}, ${phase}, ${caption})
      RETURNING *
    `
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
  }
}
