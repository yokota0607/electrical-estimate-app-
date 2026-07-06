export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    let rows
    if (search) {
      rows = await sql`
        SELECT * FROM unit_prices
        WHERE name ILIKE ${'%' + search + '%'}
           OR part_number ILIKE ${'%' + search + '%'}
           OR nicknames ILIKE ${'%' + search + '%'}
        ORDER BY category, name
      `
    } else {
      rows = await sql`SELECT * FROM unit_prices ORDER BY category, name`
    }
    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, category, unit, price, supplier, notes, part_number, maker, quantity_per_pack, order_supplier, nicknames } = body

    if (!name || price === undefined) {
      return NextResponse.json({ error: '材料名と単価は必須です' }, { status: 400 })
    }

    const [row] = await sql`
      INSERT INTO unit_prices (name, category, unit, price, supplier, notes, part_number, maker, quantity_per_pack, order_supplier, nicknames)
      VALUES (
        ${name},
        ${category || '電気工事材料'},
        ${unit || '個'},
        ${Number(price)},
        ${supplier || ''},
        ${notes || ''},
        ${part_number || ''},
        ${maker || ''},
        ${quantity_per_pack || ''},
        ${order_supplier || 'たけでん'},
        ${JSON.stringify(Array.isArray(nicknames) ? nicknames : [])}
      )
      RETURNING *
    `
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 })
  }
}
