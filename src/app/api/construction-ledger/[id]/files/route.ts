import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { parseToken } from '@/lib/auth'
import sql from '@/lib/db'
import { put } from '@vercel/blob'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rows = await sql`
      SELECT * FROM construction_files WHERE ledger_id = ${Number(id)} ORDER BY created_at ASC
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
    if (!file) return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'ファイルサイズは50MB以下にしてください' }, { status: 400 })
    }

    const blob = await put(`construction/${id}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    const [row] = await sql`
      INSERT INTO construction_files (ledger_id, stored_name, original_name, file_size, mime_type, uploaded_by)
      VALUES (${Number(id)}, ${blob.url}, ${file.name}, ${file.size}, ${file.type || ''}, ${user?.displayName || ''})
      RETURNING *
    `
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 })
  }
}
