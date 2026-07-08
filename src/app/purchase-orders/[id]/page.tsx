'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, CheckCircle, Package, Trash2 } from 'lucide-react'

interface OrderItem {
  id: number
  part_number: string
  name: string
  maker: string
  unit: string
  quantity: number
  unit_price: number
  amount: number
}

interface PurchaseOrder {
  id: number
  order_number: string
  order_date: string
  supplier: string
  delivery_destination: string
  ledger_id: number | null
  project_name: string
  ledger_project_name: string | null
  delivery_date: string
  is_received: number
  received_at: string
  notes: string
  total_amount: number
  items: OrderItem[]
}

function getDeliveryStatus(order: PurchaseOrder) {
  if (order.is_received) return { label: '入荷済み', color: 'bg-green-100 text-green-700' }
  if (!order.delivery_date) return { label: '待機中', color: 'bg-gray-100 text-gray-600' }
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (order.delivery_date < today) return { label: '納期遅れ', color: 'bg-red-100 text-red-700' }
  if (order.delivery_date <= tomorrow) return { label: 'まもなく入荷', color: 'bg-yellow-100 text-yellow-700' }
  return { label: '待機中', color: 'bg-gray-100 text-gray-600' }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n)
}

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch(`/api/purchase-orders/${id}`).then(r => r.json())
      .then(d => setOrder(d))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleReceive = async (received: boolean) => {
    if (!order) return
    setSaving(true)
    try {
      await fetch(`/api/purchase-orders/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...order,
          is_received: received,
          received_at: received ? new Date().toISOString().slice(0, 10) : '',
          items: order.items,
        })
      })
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!order) return
    if (!confirm(`発注「${order.order_number}」を削除しますか？\nこの操作は元に戻せません。`)) return
    await fetch(`/api/purchase-orders/${id}`, { method: 'DELETE' })
    router.push('/purchase-orders')
  }

  const printPDF = () => {
    if (!order) return
    const fmt = (n: number) => new Intl.NumberFormat('ja-JP').format(n)
    const rows = order.items.map((it, i) => `
      <tr>
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${i + 1}</td>
        <td style="border:1px solid #ddd;padding:6px">${it.part_number || ''}</td>
        <td style="border:1px solid #ddd;padding:6px">${it.name}</td>
        <td style="border:1px solid #ddd;padding:6px">${it.maker || ''}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${it.quantity}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${it.unit}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${fmt(it.unit_price)}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${fmt(it.unit_price * it.quantity)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
<title>発注書 ${order.order_number}</title>
<style>body{font-family:'Meiryo',sans-serif;margin:20mm;font-size:11pt}
h1{font-size:20pt;text-align:center;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin-top:16px}
th{background:#f5f5f5;border:1px solid #ddd;padding:6px;font-size:10pt}
td{font-size:10pt}.total{text-align:right;font-size:14pt;font-weight:bold;margin-top:12px}
</style></head><body>
<h1>発 注 書</h1>
<div style="display:flex;justify-content:space-between;margin-bottom:16px">
  <div>
    <div><strong>発注先：</strong>${order.supplier}</div>
    <div><strong>発注番号：</strong>${order.order_number}</div>
    <div><strong>発注日：</strong>${order.order_date}</div>
    ${order.delivery_date ? `<div><strong>納品予定日：</strong>${order.delivery_date}</div>` : ''}
    ${order.delivery_destination ? `<div><strong>納品先：</strong>${order.delivery_destination}</div>` : ''}
    ${order.project_name || order.ledger_project_name ? `<div><strong>現場名：</strong>${order.project_name || order.ledger_project_name}</div>` : ''}
  </div>
  <div style="text-align:right;font-size:10pt;color:#888">株式会社シンコネクト</div>
</div>
<table>
  <thead><tr>
    <th style="width:30px">No</th><th>品番</th><th>品名</th><th>メーカー</th>
    <th>数量</th><th>単位</th><th>単価</th><th>金額</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="total">合計金額：¥${fmt(order.total_amount)}</div>
${order.notes ? `<div style="margin-top:12px;font-size:10pt;color:#555">備考：${order.notes}</div>` : ''}
</body></html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">読み込み中...</div>
  if (!order) return <div className="p-8 text-center text-gray-400">発注が見つかりません</div>

  const status = getDeliveryStatus(order)
  const projName = order.project_name || order.ledger_project_name

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/purchase-orders" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{order.order_number}</h2>
          <p className="text-gray-500 text-sm">{order.order_date} / {order.supplier}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
        <button onClick={printPDF} className="btn-secondary flex items-center gap-1.5 text-sm">
          <Printer className="h-4 w-4" />PDF印刷
        </button>
        <button onClick={handleDelete}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 transition-colors">
          <Trash2 className="h-4 w-4" />削除
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 space-y-2 text-sm">
          <div className="flex gap-2"><span className="text-gray-400 w-24">発注先</span><span>{order.supplier}</span></div>
          <div className="flex gap-2"><span className="text-gray-400 w-24">納品先</span><span>{order.delivery_destination || '—'}</span></div>
          <div className="flex gap-2"><span className="text-gray-400 w-24">現場名</span>
            {order.ledger_id
              ? <Link href={`/construction-ledger/${order.ledger_id}`} className="text-blue-600 hover:underline">{projName || '—'}</Link>
              : <span>{projName || '—'}</span>}
          </div>
        </div>
        <div className="card p-4 space-y-2 text-sm">
          <div className="flex gap-2"><span className="text-gray-400 w-24">発注日</span><span>{order.order_date}</span></div>
          <div className="flex gap-2"><span className="text-gray-400 w-24">納品予定日</span><span>{order.delivery_date || '—'}</span></div>
          <div className="flex gap-2"><span className="text-gray-400 w-24">入荷日</span><span>{order.received_at || '—'}</span></div>
        </div>
      </div>

      {/* 入荷確認 */}
      <div className="card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-gray-400" />
          <span className="font-medium text-gray-700">入荷確認</span>
          {order.is_received && <span className="text-green-600 text-sm">入荷済み（{order.received_at}）</span>}
        </div>
        <button onClick={() => handleReceive(!order.is_received)} disabled={saving}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            order.is_received ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-500 text-white hover:bg-green-600'
          }`}>
          <CheckCircle className="h-4 w-4" />
          {order.is_received ? '入荷取消' : '入荷確認'}
        </button>
      </div>

      {/* Items */}
      <div className="card overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-center px-4 py-3 text-gray-400 font-medium w-10">No</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium w-28">品番</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">品名</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium w-24">メーカー</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium w-16">数量</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium w-14">単位</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium w-24">単価</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium w-28">金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.items.map((it, i) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-center text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{it.part_number || '—'}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{it.name}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{it.maker || '—'}</td>
                  <td className="px-4 py-2.5 text-right">{it.quantity}</td>
                  <td className="px-4 py-2.5 text-gray-500">{it.unit}</td>
                  <td className="px-4 py-2.5 text-right">{formatCurrency(it.unit_price)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(it.unit_price * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={7} className="px-4 py-3 text-right font-semibold text-gray-700">合計金額</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 text-base">{formatCurrency(order.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {order.notes && (
        <div className="card p-4 text-sm text-gray-600">
          <span className="font-medium text-gray-700 mr-2">備考：</span>{order.notes}
        </div>
      )}
    </div>
  )
}
