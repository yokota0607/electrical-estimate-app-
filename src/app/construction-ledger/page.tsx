'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, HardHat, Banknote, TrendingUp, User, ChevronRight, Calendar } from 'lucide-react'

interface LedgerRow {
  id: number
  construction_number: string
  project_name: string
  client_name: string
  location: string
  contract_amount: number
  total_amount: number
  start_date: string
  completion_date: string
  completion_date_type: string
  status: string
  assigned_to: string
  material_cost: number
  labor_cost: number
  subcontract_cost: number
  site_misc_cost: number
  purchase_cost: number
  payment_status: string
  paid_amount: number
  estimate_title: string | null
  created_at: string
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  '未着工':     { label: '未着工',     cls: 'bg-gray-100 text-gray-600' },
  '着工中':     { label: '着工中',     cls: 'bg-blue-100 text-blue-700' },
  '完成未請求': { label: '完成未請求', cls: 'bg-amber-100 text-amber-700' },
  '請求済未入金':{ label: '請求済未入金', cls: 'bg-orange-100 text-orange-700' },
  '完了':       { label: '完了',       cls: 'bg-green-100 text-green-700' },
}

const PAYMENT_STYLE: Record<string, string> = {
  '未入金':   'bg-red-100 text-red-700',
  '一部入金': 'bg-yellow-100 text-yellow-700',
  '入金済み': 'bg-green-100 text-green-700',
}

const STATUSES = ['', '未着工', '着工中', '完成未請求', '請求済未入金', '完了']

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(Math.round(n))
}

function calcRemaining(row: LedgerRow) {
  const base = row.total_amount > 0 ? row.total_amount : row.contract_amount
  return base - (row.paid_amount || 0)
}

export default function ConstructionLedgerPage() {
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')

  useEffect(() => {
    fetch('/api/construction-ledger')
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter(r => {
    const matchSearch = !search || [r.project_name, r.client_name, r.construction_number, r.location, r.assigned_to]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = !statusFilter || r.status === statusFilter
    const matchPayment = !paymentFilter || r.payment_status === paymentFilter
    return matchSearch && matchStatus && matchPayment
  })

  const totalContract = rows.reduce((s, r) => s + r.contract_amount, 0)
  const totalUnpaid = rows
    .filter(r => r.payment_status !== '入金済み')
    .reduce((s, r) => s + calcRemaining(r), 0)
  const inProgressCount = rows.filter(r => r.status === '着工中').length
  const thisMonth = new Date().toISOString().slice(0, 7)
  const completedThisMonth = rows.filter(r => r.status === '完了' && r.completion_date?.startsWith(thisMonth)).length

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-5 sm:mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">工事台帳</h2>
          <p className="text-gray-500 text-sm mt-1">工事の受注・原価・入金を一元管理</p>
        </div>
        <Link href="/construction-ledger/new" className="btn-primary flex items-center gap-1.5 text-sm sm:text-base px-3 sm:px-4">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">新規登録</span><span className="sm:hidden">新規</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <HardHat className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">着工中</p>
              <p className="text-xl font-bold text-gray-900">{inProgressCount}<span className="text-xs font-normal text-gray-400 ml-1">件</span></p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
              <Banknote className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">未入金総額</p>
              <p className="text-sm font-bold text-red-600">{formatCurrency(totalUnpaid)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">今月完成</p>
              <p className="text-xl font-bold text-gray-900">{completedThisMonth}<span className="text-xs font-normal text-gray-400 ml-1">件</span></p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">受注総額</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(totalContract)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6 p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-9 w-full" placeholder="工事番号・工事名・発注者・担当者で検索..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">ステータス: 全て</option>
          {STATUSES.filter(Boolean).map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input w-36" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
          <option value="">入金: 全て</option>
          <option>未入金</option>
          <option>一部入金</option>
          <option>入金済み</option>
        </select>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center text-gray-400 py-16">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <HardHat className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{rows.length === 0 ? '工事台帳がまだありません' : '該当する工事がありません'}</p>
          {rows.length === 0 && (
            <Link href="/construction-ledger/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">最初の工事を登録する</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(row => {
            const st = STATUS_STYLE[row.status] || STATUS_STYLE['未着工']
            const remaining = calcRemaining(row)
            const base = row.total_amount > 0 ? row.total_amount : row.contract_amount
            const paidPct = base > 0 ? Math.min(100, Math.round((row.paid_amount || 0) / base * 100)) : 0
            return (
              <Link key={row.id} href={`/construction-ledger/${row.id}`}
                className="card p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs text-gray-400">{row.construction_number}</span>
                    <h3 className="font-semibold text-gray-900 mt-0.5 truncate">{row.project_name}</h3>
                    <p className="text-sm text-gray-500 truncate">{row.client_name || '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_STYLE[row.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                      {row.payment_status}
                    </span>
                  </div>
                </div>

                {/* Amount summary */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-gray-50 rounded-lg p-2">
                  <div>
                    <p className="text-gray-400 mb-0.5">契約金額</p>
                    <p className="font-semibold text-gray-800 text-sm">{formatCurrency(row.contract_amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">入金済み</p>
                    <p className="font-semibold text-green-700 text-sm">{formatCurrency(row.paid_amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-0.5">残金</p>
                    <p className={`font-semibold text-sm ${remaining > 0 ? 'text-red-600' : 'text-gray-800'}`}>{formatCurrency(remaining)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                {base > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>入金進捗</span><span>{paidPct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{row.assigned_to || '未設定'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{row.start_date || '—'} 〜 {row.completion_date || '—'}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
