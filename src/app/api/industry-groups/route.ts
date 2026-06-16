export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM industry_groups ORDER BY sort_order, name`
    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: '業種名を入力してください' }, { status: 400 })
    const [maxRow] = await sql`SELECT MAX(sort_order) as m FROM industry_groups`
    const maxOrder = maxRow.m ?? -1
    const [row] = await sql`
      INSERT INTO industry_groups (name, sort_order) VALUES (${name.trim()}, ${Number(maxOrder) + 1})
      RETURNING *
    `
    return NextResponse.json(row, { status: 201 })
  } catch (error: unknown) {
    if ((error as { message?: string }).message?.includes('unique') || (error as { message?: string }).message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'その業種名はすでに存在します' }, { status: 409 })
    }
    console.error(error)
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 })
  }
}
