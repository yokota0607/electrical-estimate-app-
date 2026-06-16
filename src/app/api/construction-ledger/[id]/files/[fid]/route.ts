import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { del } from '@vercel/blob'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; fid: string }> }) {
  try {
    const { fid } = await params
    const rows = await sql`SELECT * FROM construction_files WHERE id = ${Number(fid)}`
    if (rows.length === 0) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

    const row = rows[0] as { stored_name: string; original_name: string; mime_type: string }
    return NextResponse.redirect(row.stored_name)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'ダウンロードに失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; fid: string }> }) {
  try {
    const { fid } = await params
    const rows = await sql`SELECT stored_name FROM construction_files WHERE id = ${Number(fid)}`

    if (rows.length > 0) {
      const row = rows[0] as { stored_name: string }
      try { await del(row.stored_name) } catch { /* ignore blob delete errors */ }
      await sql`DELETE FROM construction_files WHERE id = ${Number(fid)}`
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
