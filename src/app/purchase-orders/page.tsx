'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Search, Package, ChevronRight, Trash2 } from 'lucide-react'

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
  created_at: string
}

function getDeliveryStatus(order: PurchaseOrder) {
  if (order.is_received) return { label: '入荷済み', color: 'bg-green-100 text-green-700', icon: '✓' }
  if (!order.delivery_date) return { label: '待機中', color: 'bg-gray-100 text-gray-600', icon: '○' }
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (order.delivery_date < today) return { label: '納期遅れ', color: 'bg-red-100 text-red-700', icon: '!' }
  if (order.delivery_date <= tomorrow) return { label: 'まもなく入荷', color: 'bg-yellow-100 text-yellow-700', icon: '▲' }
  return { label: '待機中', color: 'bg-gray-100 text-gray-600', icon: '○' }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n)
}

function getMonths(orders: PurchaseOrder[]) {
  const months = [...new Set(orders.map(o => o.order_date?.slice(0, 7)).filter(Boolean))].sort().reverse()
  return months
}
function getSuppliers(orders: PurchaseOrder[]) {
  return [...new Set(orders.map(o => o.supplier).filter(Boolean))].sort()
}
function getProjects(orders: PurchaseOrder[]) {
  return [...new Set(orders.map(o => o.project_name || o.ledger_project_name || '').filter(Boolean))].sort()
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = () => {
    const params = new URLSearchParams()
    if (monthFilter) params.set('month', monthFilter)
    if (supplierFilter) params.set('supplier', supplierFilter)
    fetch(`/api/purchase-orders?${params}`).then(r => r.json())
      .then(d => setOrders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [monthFilter, supplierFilter])

  const filtered = orders.filter(o => {
    const projName = o.project_name || o.ledger_project_name || ''
    if (projectFilter && !projName.includes(projectFilter)) return false
    if (search && !o.order_number.includes(search) && !o.supplier.includes(search) && !projName.includes(search)) return false
    if (statusFilter !== 'all') {
      const s = getDeliveryStatus(o)
      if (statusFilter === 'received' && !o.is_received) return false
      if (statusFilter === 'overdue' && s.label !== '納期遅れ') return false
      if (statusFilter === 'soon' && s.label !== 'まもなく入荷') return false
      if (statusFilter === 'waiting' && s.label !== '待機中') return false
    }
    return true
  })

  // 月別合計
  const monthlyTotals = filtered.reduce((acc, o) => {
    const m = o.order_date?.slice(0, 7) || '不明'
    acc[m] = (acc[m] || 0) + (o.total_amount || 0)
    return acc
  }, {} as Record<string, number>)

  const handleReceive = async (id: number, received: boolean) => {
    await fetch(`/api/purchase-orders/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_received: received, received_at: received ? new Date().toISOString().slice(0, 10) : '' })
    })
    load()
  }

  const handleDelete = async (id: number, orderNumber: string) => {
    if (!confirm(`発注「${orderNumber}」を削除しますか？\nこの操作は元に戻せません。`)) return
    await fetch(`/api/purchase-orders/${id}`, { method: 'DELETE' })
    load()
  }

  const months = getMonths(orders)
  const suppliers = getSuppliers(orders)
  const projects = getProjects(orders)

  const grandTotal = filtered.reduce((s, o) => s + (o.total_amount || 0), 0)
  const overdueCount = filtered.filter(o => getDeliveryStatus(o).label === '納期遅れ').length

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">発注管理</h2>
            <p className="text-gray-500 text-sm mt-1">
              {filtered.length}件 / 合計 {formatCurrency(grandTotal)}
              {overdueCount > 0 && <span className="ml-2 text-red-600 font-medium">納期遅れ {overdueCount}件</span>}
            </p>
          </div>
          <Link href="/unit-prices" className="btn-primary flex items-center gap-1.5 text-sm px-3">
            <ShoppingCart className="h-4 w-4" />新規発注
          </Link>
        </div>
      </div>

      {/* 月別合計サマリー */}
      {Object.keys(monthlyTotals).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Object.entries(monthlyTotals).slice(0, 4).map(([m, t]) => (
            <div key={m} className="card p-3">
              <div className="text-xs text-gray-500 mb-1">{m} 発注合計</div>
              <div className="text-base font-bold text-gray-900">{formatCurrency(t)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-9 w-48" placeholder="発注番号・業者・現場" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-36" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
          <option value="">全月</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="input w-36" value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
          <option value="">全発注先</option>
          {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input w-40" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
          <option value="">全現場</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">全ステータス</option>
          <option value="waiting">待機中</option>
          <option value="soon">まもなく入荷</option>
          <option value="overdue">納期遅れ</option>
          <option value="received">入荷済み</option>
        </select>
      </div>

      {/* Orders table */}
      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-gray-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>発注データがありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">発注番号</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">発注日</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">発注先</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">現場名</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">納品予定日</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">ステータス</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">金額</th>
                  <th className="text-center px-4 py-3 text-gray-400 font-medium">入荷確認</th>
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(o => {
                  const status = getDeliveryStatus(o)
                  const projName = o.project_name || o.ledger_project_name || '—'
                  return (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{o.order_number}</td>
                      <td className="px-4 py-3 text-gray-700">{o.order_date}</td>
                      <td className="px-4 py-3 text-gray-700">{o.supplier}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{projName}</td>
                      <td className="px-4 py-3 text-gray-600">{o.delivery_date || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(o.total_amount || 0)}</td>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" checked={!!o.is_received}
                          onChange={e => handleReceive(o.id, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-green-600 cursor-pointer" />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/purchase-orders/${o.id}`} className="text-gray-400 hover:text-blue-600">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => handleDelete(o.id, o.order_number)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1" title="削除">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
