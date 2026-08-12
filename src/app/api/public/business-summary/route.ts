export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import sql from '@/lib/db'

// 閲覧専用（読み取り専用）の経営サマリーエンドポイント。
// GET のみを公開し、POST/PUT/PATCH/DELETE は一切実装しない。
// クエリパラメータ ?token=... が環境変数 PUBLIC_REPORT_TOKEN と一致した場合のみ返す。

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

function yen(n: number): string {
  return '¥' + Math.round(Number(n) || 0).toLocaleString('ja-JP')
}

type Row = Record<string, unknown>
const num = (v: unknown) => Number(v) || 0
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

  try {
    // --- データ取得（すべて SELECT のみ） ---
    const ledgers = await sql`
      SELECT id, construction_number, project_name, client_name, location,
             contract_amount, total_amount, labor_cost, site_misc_cost,
             status, payment_status, completion_date, completion_date_type
      FROM construction_ledger
      ORDER BY construction_number ASC, id ASC
    `
    const paymentAgg = await sql`
      SELECT ledger_id, COALESCE(SUM(amount), 0) AS received
      FROM payment_history GROUP BY ledger_id
    `
    const orderAgg = await sql`
      SELECT ledger_id,
             COALESCE(SUM(CASE WHEN COALESCE(order_category,'電気工事材料') <> '外注工事' THEN total_amount ELSE 0 END), 0) AS material_auto,
             COALESCE(SUM(CASE WHEN COALESCE(order_category,'電気工事材料') =  '外注工事' THEN total_amount ELSE 0 END), 0) AS subcontract_auto
      FROM purchase_orders GROUP BY ledger_id
    `
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const recentReports = await sql`
      SELECT dr.report_date, dr.work_content, dr.worker_name, dr.work_hours,
             cl.project_name
      FROM daily_reports dr
      JOIN construction_ledger cl ON cl.id = dr.ledger_id
      WHERE dr.report_date >= ${cutoff}
      ORDER BY dr.report_date DESC, dr.created_at DESC
    `

    const receivedByLedger = new Map<number, number>()
    for (const r of paymentAgg as Row[]) receivedByLedger.set(num(r.ledger_id), num(r.received))
    const orderByLedger = new Map<number, { material: number; subcontract: number }>()
    for (const r of orderAgg as Row[]) {
      orderByLedger.set(num(r.ledger_id), { material: num(r.material_auto), subcontract: num(r.subcontract_auto) })
    }

    // --- テキスト組み立て ---
    const lines: string[] = []
    const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    lines.push('════════════════════════════════════════')
    lines.push('  経営サマリーレポート（閲覧専用）')
    lines.push(`  生成日時: ${now}`)
    lines.push(`  登録工事数: ${(ledgers as Row[]).length} 件`)
    lines.push('════════════════════════════════════════')
    lines.push('')

    // 1. 進行中の工事一覧（status が「完了」以外）
    const ongoing = (ledgers as Row[]).filter(l => str(l.status) !== '完了')
    lines.push('■ 1. 進行中の工事一覧')
    lines.push('----------------------------------------')
    if (ongoing.length === 0) {
      lines.push('（進行中の工事はありません）')
    } else {
      for (const l of ongoing) {
        const due = str(l.completion_date) || '未定'
        const dueType = str(l.completion_date_type) || '予定'
        lines.push(`・${str(l.project_name) || '(工事名未設定)'}`)
        lines.push(`    得意先: ${str(l.client_name) || '—'}`)
        lines.push(`    状況: ${str(l.status) || '—'}`)
        lines.push(`    完了${dueType}日: ${due}`)
      }
    }
    lines.push('')

    // 2. 入金状況（payment_status が「入金済み」以外）
    const unpaid = (ledgers as Row[]).filter(l => str(l.payment_status) !== '入金済み')
    lines.push('■ 2. 入金状況（未入金・一部入金の工事）')
    lines.push('----------------------------------------')
    if (unpaid.length === 0) {
      lines.push('（未回収の入金はありません）')
    } else {
      let totalRemaining = 0
      for (const l of unpaid) {
        const total = num(l.total_amount)
        const base = total > 0 ? total : num(l.contract_amount)
        const received = receivedByLedger.get(num(l.id)) || 0
        const remaining = base - received
        totalRemaining += remaining
        lines.push(`・${str(l.project_name) || '(工事名未設定)'}（${str(l.client_name) || '得意先不明'}）`)
        lines.push(`    入金状況: ${str(l.payment_status) || '未入金'}`)
        lines.push(`    請求ベース: ${yen(base)} / 入金済: ${yen(received)} / 残: ${yen(remaining)}`)
      }
      lines.push('')
      lines.push(`  未回収 合計: ${yen(totalRemaining)}`)
    }
    lines.push('')

    // 3. 工事ごとの原価・利益サマリー
    lines.push('■ 3. 工事ごとの原価・利益サマリー')
    lines.push('----------------------------------------')
    lines.push('  ※ 材料費・外注費は発注履歴の自動集計、労務費・現場雑費は登録値を使用')
    if ((ledgers as Row[]).length === 0) {
      lines.push('（工事がありません）')
    } else {
      let sumContract = 0, sumCost = 0, sumProfit = 0
      for (const l of ledgers as Row[]) {
        const contract = num(l.contract_amount)
        const o = orderByLedger.get(num(l.id)) || { material: 0, subcontract: 0 }
        const costTotal = o.material + o.subcontract + num(l.labor_cost) + num(l.site_misc_cost)
        const profit = contract - costTotal
        const margin = contract > 0 ? Math.round((profit / contract) * 100) : null
        sumContract += contract; sumCost += costTotal; sumProfit += profit
        lines.push(`・${str(l.project_name) || '(工事名未設定)'}`)
        lines.push(`    契約金額(税抜): ${yen(contract)} / 原価合計: ${yen(costTotal)}`)
        lines.push(`    利益: ${yen(profit)} / 利益率: ${margin == null ? '—' : margin + '%'}`)
      }
      const totalMargin = sumContract > 0 ? Math.round((sumProfit / sumContract) * 100) : null
      lines.push('')
      lines.push(`  【全体】契約合計: ${yen(sumContract)} / 原価合計: ${yen(sumCost)} / 利益合計: ${yen(sumProfit)} / 利益率: ${totalMargin == null ? '—' : totalMargin + '%'}`)
    }
    lines.push('')

    // 4. 直近14日分の作業日報
    lines.push(`■ 4. 直近14日分の作業日報（${cutoff} 以降）`)
    lines.push('----------------------------------------')
    if ((recentReports as Row[]).length === 0) {
      lines.push('（直近14日の日報はありません）')
    } else {
      for (const r of recentReports as Row[]) {
        const hours = num(r.work_hours)
        lines.push(`・${str(r.report_date)}  [${str(r.project_name) || '工事名不明'}]`)
        lines.push(`    作業内容: ${str(r.work_content) || '—'}`)
        lines.push(`    作業員: ${str(r.worker_name) || '—'}${hours > 0 ? ` / ${hours}時間` : ''}`)
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
    return new NextResponse('500 Internal Server Error: レポート生成に失敗しました。\n', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
