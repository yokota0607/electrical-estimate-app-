export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, category, unit, price, supplier, notes, part_number, maker, quantity_per_pack, order_supplier, nicknames } = body

    const [row] = await sql`
      UPDATE unit_prices
      SET name = ${name},
          category = ${category},
          unit = ${unit},
          price = ${Number(price)},
          supplier = ${supplier || ''},
          notes = ${notes || ''},
          part_number = ${part_number || ''},
          maker = ${maker || ''},
          quantity_per_pack = ${quantity_per_pack || ''},
          order_supplier = ${order_supplier || 'たけでん'},
          nicknames = ${JSON.stringify(Array.isArray(nicknames) ? nicknames : [])},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json(row)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await sql`DELETE FROM unit_prices WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
