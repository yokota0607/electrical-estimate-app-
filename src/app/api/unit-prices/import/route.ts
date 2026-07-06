export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

interface ImportItem {
  part_number: string
  name: string
  maker: string
  unit: string
  quantity_per_pack: string
  price: number
  category: string
  order_supplier: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const items: ImportItem[] = body.items

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'データがありません' }, { status: 400 })
    }

    let inserted = 0
    let skipped = 0

    for (const item of items) {
      if (!item.name) continue
      // 品番が一致する既存レコードがあればスキップ
      if (item.part_number) {
        const existing = await sql`SELECT id FROM unit_prices WHERE part_number = ${item.part_number}`
        if (existing.length > 0) { skipped++; continue }
      }
      await sql`
        INSERT INTO unit_prices (name, category, unit, price, supplier, notes, part_number, maker, quantity_per_pack, order_supplier, nicknames)
        VALUES (
          ${item.name},
          ${item.category || '電気工事材料'},
          ${item.unit || '個'},
          ${Number(item.price) || 0},
          '',
          '',
          ${item.part_number || ''},
          ${item.maker || ''},
          ${item.quantity_per_pack || ''},
          ${item.order_supplier || 'たけでん'},
          '[]'
        )
      `
      inserted++
    }

    return NextResponse.json({ ok: true, inserted, skipped })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'インポートに失敗しました', detail: String(error) }, { status: 500 })
  }
}
