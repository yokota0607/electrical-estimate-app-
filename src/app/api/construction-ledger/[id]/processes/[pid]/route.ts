export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  const { pid } = await params
  const body = await req.json()
  const [row] = await sql`
    UPDATE construction_processes SET name = ${body.name ?? ''}, weight = ${Number(body.weight) ?? 0}, is_completed = ${body.is_completed ? 1 : 0}
    WHERE id = ${Number(pid)}
    RETURNING *
  `
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  const { pid } = await params
  await sql`DELETE FROM construction_processes WHERE id = ${Number(pid)}`
  return NextResponse.json({ ok: true })
}
