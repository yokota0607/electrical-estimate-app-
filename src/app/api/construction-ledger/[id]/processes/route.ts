export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await sql`
    SELECT * FROM construction_processes WHERE ledger_id = ${Number(id)} ORDER BY sort_order, id
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const [maxRow] = await sql`
    SELECT COALESCE(MAX(sort_order), -1) as m FROM construction_processes WHERE ledger_id = ${Number(id)}
  `
  const [row] = await sql`
    INSERT INTO construction_processes (ledger_id, name, weight, is_completed, sort_order)
    VALUES (${Number(id)}, ${body.name || ''}, ${Number(body.weight) || 0}, 0, ${Number(maxRow.m) + 1})
    RETURNING *
  `
  return NextResponse.json(row, { status: 201 })
}
