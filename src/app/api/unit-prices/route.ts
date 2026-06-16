export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM unit_prices ORDER BY category, name`
    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, category, unit, price, supplier, notes } = body

    if (!name || price === undefined) {
      return NextResponse.json({ error: '材料名と単価は必須です' }, { status: 400 })
    }

    const [row] = await sql`
      INSERT INTO unit_prices (name, category, unit, price, supplier, notes)
      VALUES (${name}, ${category || '電気工事材料'}, ${unit || '個'}, ${Number(price)}, ${supplier || ''}, ${notes || ''})
      RETURNING *
    `
    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 })
  }
}
