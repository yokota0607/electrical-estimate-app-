export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import sql from '@/lib/db'
import { similarity, MATCH_THRESHOLD } from '@/lib/fuzzy'

// 経営相談チャットから単価を検索するための閲覧専用エンドポイント。
// business-summary と同じく ?token=... が PUBLIC_REPORT_TOKEN と一致した場合のみ返す。
// GET のみを公開し、書き込み系メソッドは一切実装しない。

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

function yen(n: number): string {
  return '¥' + Math.round(Number(n) || 0).toLocaleString('ja-JP')
}

const str = (v: unknown) => (v == null ? '' : String(v))

export async function GET(request: NextRequest) {
  // --- 認証（クエリトークン） ---
  const token = request.nextUrl.searchParams.get('token') || ''
  const expected = process.env.PUBLIC_REPORT_TOKEN || ''
  if (!expected || !safeEqual(token, expected)) {
    return new NextResponse('401 Unauthorized: 有効な token が必要です。\n', {
      status: 401,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  // --- 検索キーワード（q が空なら全件は返さない） ---
  const q = (request.nextUrl.searchParams.get('q') || '').trim()
  if (!q) {
    return new NextResponse('検索キーワードを指定してください（例: ?q=VVF）。\n', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  try {
    // まず DB 側で部分一致（ILIKE）で粗く絞り込む
    const like = `%${q}%`
    const rows = await sql`
      SELECT id, name, part_number, maker, unit, price, supplier, order_supplier, category, nicknames
      FROM unit_prices
      WHERE name ILIKE ${like}
         OR part_number ILIKE ${like}
         OR maker ILIKE ${like}
         OR nicknames ILIKE ${like}
      ORDER BY category, name
    `

    // ILIKE でヒットしなかった場合は、品名のファジー一致でフォールバック
    let hits = rows as Record<string, unknown>[]
    let fuzzy = false
    if (hits.length === 0) {
      const all = await sql`SELECT id, name, part_number, maker, unit, price, supplier, order_supplier, category, nicknames FROM unit_prices`
      hits = (all as Record<string, unknown>[])
        .map(r => ({ r, s: Math.max(similarity(q, str(r.name)), similarity(q, str(r.part_number))) }))
        .filter(x => x.s >= MATCH_THRESHOLD)
        .sort((a, b) => b.s - a.s)
        .slice(0, 30)
        .map(x => x.r)
      fuzzy = hits.length > 0
    }

    const lines: string[] = []
    lines.push('════════════════════════════════════════')
    lines.push(`  単価検索結果（閲覧専用）  キーワード: 「${q}」`)
    lines.push(`  ヒット件数: ${hits.length} 件${fuzzy ? '（あいまい一致）' : ''}`)
    lines.push('════════════════════════════════════════')
    lines.push('')

    if (hits.length === 0) {
      lines.push('該当する品目は見つかりませんでした。')
    } else {
      for (const r of hits) {
        lines.push(`・${str(r.name) || '(品名なし)'}`)
        lines.push(`    品番: ${str(r.part_number) || '—'} / メーカー: ${str(r.maker) || '—'}`)
        lines.push(`    単価: ${yen(Number(r.price))} / 単位: ${str(r.unit) || '—'}`)
        lines.push(`    仕入先: ${str(r.supplier) || '—'} / 発注先: ${str(r.order_supplier) || '—'}`)
      }
    }
    lines.push('')
    lines.push('════════════════════════════════════════')
    lines.push('（このレポートは閲覧専用です。データの変更はできません）')
    lines.push('')

    return new NextResponse(lines.join('\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error(error)
    return new NextResponse('500 Internal Server Error: 検索に失敗しました。\n', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
