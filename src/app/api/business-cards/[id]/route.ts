export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'

function parseRow(r: Record<string, unknown>) {
  return {
    ...r,
    qualifications: (() => { try { return JSON.parse(r.qualifications as string || '[]') } catch { return [] } })(),
    industry: (() => { try { return JSON.parse(r.industry as string || '[]') } catch { return [] } })(),
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name, name_kana, company, department, title,
      email, phone, mobile, fax, postal_code, address, website,
      qualifications, industry, transaction_type, notes,
    } = body

    const existing = await sql`SELECT id FROM business_cards WHERE id = ${id}`
    if (existing.length === 0) {
      return NextResponse.json({ error: '名刺が見つかりません' }, { status: 404 })
    }

    const [row] = await sql`
      UPDATE business_cards
      SET name=${name || ''}, name_kana=${name_kana || ''}, company=${company || ''}, department=${department || ''},
          title=${title || ''}, email=${email || ''}, phone=${phone || ''}, mobile=${mobile || ''},
          fax=${fax || ''}, postal_code=${postal_code || ''}, address=${address || ''}, website=${website || ''},
          qualifications=${JSON.stringify(Array.isArray(qualifications) ? qualifications : [])},
          industry=${JSON.stringify(Array.isArray(industry) ? industry : [])},
          transaction_type=${transaction_type || ''}, notes=${notes || ''}, updated_at=NOW()
      WHERE id=${id}
      RETURNING *
    `
    return NextResponse.json(parseRow(row as Record<string, unknown>))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const existing = await sql`SELECT id FROM business_cards WHERE id = ${id}`
    if (existing.length === 0) {
      return NextResponse.json({ error: '名刺が見つかりません' }, { status: 404 })
    }
    await sql`DELETE FROM business_cards WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
}
