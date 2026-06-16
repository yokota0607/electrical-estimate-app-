import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { name } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: '業種名を入力してください' }, { status: 400 })
    const existing = await sql`SELECT id FROM industry_groups WHERE id = ${id}`
    if (existing.length === 0) return NextResponse.json({ error: '業種が見つかりません' }, { status: 404 })
    const [row] = await sql`UPDATE industry_groups SET name = ${name.trim()} WHERE id = ${id} RETURNING *`
    return NextResponse.json(row)
  } catch (error: unknown) {
    if ((error as { message?: string }).message?.includes('unique') || (error as { message?: string }).message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'その業種名はすでに存在します' }, { status: 409 })
    }
    console.error(error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const existing = await sql`SELECT id FROM industry_groups WHERE id = ${id}`
    if (existing.length === 0) return NextResponse.json({ error: '業種が見つかりません' }, { status: 404 })
    await sql`DELETE FROM industry_groups WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
