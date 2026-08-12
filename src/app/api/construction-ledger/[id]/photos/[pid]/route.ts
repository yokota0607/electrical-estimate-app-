export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import path from 'path'
import fs from 'fs/promises'

const PHASES = ['施工前', '施工中', '完了後']

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  try {
    const { pid } = await params
    const body = await request.json()
    const phaseRaw = body.phase
    const phase = PHASES.includes(phaseRaw) ? phaseRaw : '施工前'
    const description = body.description ?? ''
    const [row] = await sql`
      UPDATE site_photos SET phase = ${phase}, description = ${description} WHERE id = ${Number(pid)} RETURNING *
    `
    return NextResponse.json(row)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  try {
    const { pid } = await params
    const rows = await sql`SELECT stored_name FROM site_photos WHERE id = ${Number(pid)}`

    if (rows.length > 0) {
      const row = rows[0] as { stored_name: string }
      const storedName = row.stored_name

      if (storedName.startsWith('http')) {
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          try {
            const { del } = await import('@vercel/blob')
            await del(storedName)
          } catch { /* ignore blob delete errors */ }
        }
      } else {
        try {
          const localPath = path.join(process.cwd(), 'public', storedName)
          await fs.unlink(localPath)
        } catch { /* ignore local delete errors */ }
      }

      await sql`DELETE FROM site_photos WHERE id = ${Number(pid)}`
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
