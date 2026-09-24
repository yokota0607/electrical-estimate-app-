export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { analyzeOrderDocument } from '@/lib/claude'
import path from 'path'
import fs from 'fs/promises'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fid: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEYが設定されていません' }, { status: 400 })
  }

  try {
    const { fid } = await params
    const rows = await sql`SELECT * FROM construction_files WHERE id = ${Number(fid)}`
    if (rows.length === 0) return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 })

    const file = rows[0] as { stored_name: string; mime_type: string; original_name: string }

    if (file.mime_type !== 'application/pdf') {
      return NextResponse.json({ error: 'PDFファイルのみ対応しています' }, { status: 400 })
    }

    let base64: string
    if (file.stored_name.startsWith('http')) {
      const res = await fetch(file.stored_name)
      if (!res.ok) throw new Error('ファイルの取得に失敗しました')
      base64 = Buffer.from(await res.arrayBuffer()).toString('base64')
    } else {
      const localPath = path.join(process.cwd(), 'public', file.stored_name)
      base64 = (await fs.readFile(localPath)).toString('base64')
    }

    const result = await analyzeOrderDocument(base64)
    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
