export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

// 確認画面で選択された品目だけ単価を更新する。
// 変更履歴（更新日・変更前単価・変更後単価）を notes の先頭に追記して残す。

interface UpdateItem {
  id: number
  new_price: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const items: UpdateItem[] = Array.isArray(body.items) ? body.items : []
    const source: string = typeof body.source === 'string' ? body.source : 'テキサスCSV'
    if (items.length === 0) {
      return NextResponse.json({ error: '更新対象が選択されていません' }, { status: 400 })
    }

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }) // YYYY-MM-DD
    let updated = 0
    let skipped = 0

    for (const item of items) {
      const id = Number(item.id)
      const newPrice = Number(item.new_price)
      if (!id || !Number.isFinite(newPrice)) { skipped++; continue }

      const [current] = await sql`SELECT price, notes FROM unit_prices WHERE id = ${id}`
      if (!current) { skipped++; continue }

      const oldPrice = Number(current.price) || 0
      if (oldPrice === newPrice) { skipped++; continue }

      const historyLine = `[${today}] 単価改定 ${oldPrice.toLocaleString('ja-JP')}→${newPrice.toLocaleString('ja-JP')} (${source})`
      const prevNotes = String(current.notes ?? '').trim()
      const notes = prevNotes ? `${historyLine}\n${prevNotes}` : historyLine

      await sql`
        UPDATE unit_prices
        SET price = ${newPrice}, notes = ${notes}, updated_at = NOW()
        WHERE id = ${id}
      `
      updated++
    }

    return NextResponse.json({ ok: true, updated, skipped })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '更新に失敗しました', detail: String(error) }, { status: 500 })
  }
}
