export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { matchOne, HIGH_CONFIDENCE, type Matchable } from '@/lib/fuzzy'

// テキサスの発注データCSVから読み取った行を受け取り、既存の unit_prices と照合する。
// 反映は行わず、確認用のマッチング結果（現在単価・新単価・差額・信頼度）だけを返す。

interface CsvRow {
  part_number?: string
  name?: string
  price?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rows: CsvRow[] = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSVから読み取れる行がありませんでした' }, { status: 400 })
    }

    const existingRaw = await sql`
      SELECT id, name, part_number, maker, unit, price, category, supplier, order_supplier, notes
      FROM unit_prices
    `
    const existing = (existingRaw as Record<string, unknown>[]).map(r => ({
      ...r,
      id: Number(r.id),
      name: String(r.name ?? ''),
      part_number: String(r.part_number ?? ''),
      price: Number(r.price) || 0,
    })) as (Matchable & Record<string, unknown>)[]

    const matched: unknown[] = []
    const unmatched: unknown[] = []

    for (const row of rows) {
      const name = String(row.name ?? '').trim()
      const partNumber = String(row.part_number ?? '').trim()
      const newPrice = Number(row.price) || 0
      if (!name && !partNumber) continue

      const result = matchOne({ part_number: partNumber, name }, existing)

      if (result.candidate) {
        const current = result.candidate
        matched.push({
          existing_id: current.id,
          existing_part_number: current.part_number,
          existing_name: current.name,
          existing_maker: current.maker ?? '',
          existing_unit: current.unit ?? '',
          current_price: current.price,
          new_price: newPrice,
          diff: newPrice - current.price,
          csv_part_number: partNumber,
          csv_name: name,
          match_type: result.matchType,
          score: Math.round(result.score * 100) / 100,
          // 品番一致・品名完全一致以外で信頼度が低いものは要確認（UIで黄色警告）
          low_confidence: result.matchType === 'fuzzy_name' && result.score < HIGH_CONFIDENCE,
        })
      } else {
        unmatched.push({
          csv_part_number: partNumber,
          csv_name: name,
          new_price: newPrice,
        })
      }
    }

    return NextResponse.json({ ok: true, matched, unmatched, existing_count: existing.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '照合に失敗しました', detail: String(error) }, { status: 500 })
  }
}
