'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Tag, TrendingUp, Plus, ChevronRight, Clock, CheckCircle, FileEdit, BookOpen, HardHat, Banknote, Calendar } from 'lucide-react'

interface Estimate {
  id: number
  title: string
  project_name: string
  customer_name: string
  status: string
  total_amount: number
  tax_rate: number
  item_count: number
  created_at: string
}

interface LedgerSummary {
  count: number
  totalContract: number
  totalProfit: number
  unpaidCount: number
  inProgressCount: number
  totalUnpaid: number
  completedThisMonth: number
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-600' },
  completed: { label: '完成', color: 'bg-blue-100 text-blue-700' },
  approved: { label: '承認済', color: 'bg-green-100 text-green-700' },
  rejected: { label: '却下', color: 'bg-red-100 text-red-700' },
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount)
}

export default function Dashboard() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [unitPriceCount, setUnitPriceCount] = useState(0)
  const [ledger, setLedger] = useState<LedgerSummary>({ count: 0, totalContract: 0, totalProfit: 0, unpaidCount: 0, inProgressCount: 0, totalUnpaid: 0, completedThisMonth: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/estimates').then(r => r.json()),
      fetch('/api/unit-prices').then(r => r.json()),
      fetch('/api/construction-ledger').then(r => r.json()),
    ]).then(([est, prices, ledgerRows]) => {
      setEstimates(Array.isArray(est) ? est : [])
      setUnitPriceCount(Array.isArray(prices) ? prices.length : 0)
      if (Array.isArray(ledgerRows)) {
        type R = { contract_amount: number; total_amount: number; material_cost: number; labor_cost: number; subcontract_cost: number; site_misc_cost: number; purchase_cost: number; payment_status: string; status: string; completion_date: string; paid_amount: number }
        const totalContract = ledgerRows.reduce((s: number, r: R) => s + (r.contract_amount || 0), 0)
        const totalProfit = ledgerRows.reduce((s: number, r: R) =>
          s + (r.contract_amount - r.material_cost - r.labor_cost - r.subcontract_cost - (r.site_misc_cost || 0) - (r.purchase_cost || 0)), 0)
        const unpaidCount = ledgerRows.filter((r: R) => r.payment_status === '未入金').length
        const inProgressCount = ledgerRows.filter((r: R) => r.status === '着工中').length
        const thisMonth = new Date().toISOString().slice(0, 7)
        const completedThisMonth = ledgerRows.filter((r: R) => r.status === '完了' && r.completion_date?.startsWith(thisMonth)).length
        const totalUnpaid = ledgerRows
          .filter((r: R) => r.payment_status !== '入金済み')
          .reduce((s: number, r: R) => {
            const base = r.total_amount > 0 ? r.total_amount : r.contract_amount
            return s + Math.max(0, base - (r.paid_amount || 0))
          }, 0)
        setLedger({ count: ledgerRows.length, totalContract, totalProfit, unpaidCount, inProgressCount, totalUnpaid, completedThisMonth })
      }
    }).finally(() => setLoading(false))
  }, [])

  const totalAmount = estimates.reduce((sum, e) => sum + (e.total_amount || 0), 0)
  const approvedCount = estimates.filter(e => e.status === 'approved').length
  const recentEstimates = estimates.slice(0, 5)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="text-gray-500 text-sm mt-1">電気工事見積もり管理システム</p>
      </div>

      {/* 工事台帳 stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <HardHat className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">進行中工事</p>
            <p className="text-xl font-bold text-gray-900">{ledger.inProgressCount}<span className="text-xs font-normal text-gray-400 ml-1">件</span></p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Banknote className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400">未入金総額</p>
            <p className="text-sm font-bold text-red-600">{formatCurrency(ledger.totalUnpaid)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Calendar className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">今月完成</p>
            <p className="text-xl font-bold text-gray-900">{ledger.completedThisMonth}<span className="text-xs font-normal text-gray-400 ml-1">件</span></p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">見積もり件数</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{estimates.length}</p>
          <p className="text-gray-400 text-xs mt-1">承認済み {approvedCount}件</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">登録単価</span>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Tag className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{unitPriceCount}</p>
          <p className="text-gray-400 text-xs mt-1">材料・資材</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">工事台帳</span>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <HardHat className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{ledger.count}</p>
          <p className="text-gray-400 text-xs mt-1">未入金 {ledger.unpaidCount}件</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm font-medium">工事利益合計</span>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
          <p className={`text-xl font-bold ${ledger.totalProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
            {formatCurrency(ledger.totalProfit)}
          </p>
          <p className="text-gray-400 text-xs mt-1">台帳ベース</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/estimates/new"
          className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-700 transition-colors">
            <Plus className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">新規見積もり作成</p>
            <p className="text-gray-400 text-sm">PDF図面をAI拾い出し</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500" />
        </Link>

        <Link href="/construction-ledger/new"
          className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center group-hover:bg-orange-600 transition-colors">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">工事台帳に登録</p>
            <p className="text-gray-400 text-sm">原価・入金を管理</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500" />
        </Link>

        <Link href="/unit-prices"
          className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
          <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center group-hover:bg-green-700 transition-colors">
            <Tag className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">単価表を管理</p>
            <p className="text-gray-400 text-sm">材料・資材の単価を更新</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500" />
        </Link>
      </div>

      {/* Recent Estimates */}
      <div className="card">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">最近の見積もり</h3>
          <Link href="/estimates" className="text-blue-600 text-sm hover:underline">すべて表示</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">読み込み中...</div>
        ) : recentEstimates.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>見積もりがまだありません</p>
            <Link href="/estimates/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
              最初の見積もりを作成する
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentEstimates.map(est => {
              const status = STATUS_MAP[est.status] || STATUS_MAP.draft
              const taxAmount = est.total_amount * est.tax_rate
              return (
                <Link key={est.id} href={`/estimates/${est.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    {est.status === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : est.status === 'completed' ? (
                      <FileText className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FileEdit className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{est.title}</p>
                    <p className="text-gray-400 text-xs truncate">{est.customer_name || est.project_name || '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900 text-sm">{formatCurrency(est.total_amount + taxAmount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="text-gray-300 flex-shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
