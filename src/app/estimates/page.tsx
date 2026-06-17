'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Plus, Search, Trash2, ChevronRight, FileEdit, CheckCircle, Clock } from 'lucide-react'

interface Estimate {
  id: number
  title: string
  project_name: string
  customer_name: string
  status: string
  total_amount: number
  tax_rate: number
  item_count: number
  created_by: string
  created_at: string
  updated_at: string
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-600' },
  completed: { label: '完成', color: 'bg-blue-100 text-blue-700' },
  approved: { label: '承認済', color: 'bg-green-100 text-green-700' },
  rejected: { label: '却下', color: 'bg-red-100 text-red-700' },
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n)
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = () => {
    fetch('/api/estimates')
      .then(r => r.json())
      .then(data => setEstimates(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return
    await fetch(`/api/estimates/${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = estimates.filter(e => {
    const matchSearch = !search ||
      e.title.includes(search) ||
      e.project_name.includes(search) ||
      e.customer_name.includes(search)
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">見積もり履歴</h2>
          <p className="text-gray-500 text-sm mt-1">全{estimates.length}件</p>
        </div>
        <Link href="/estimates/new" className="btn-primary flex items-center gap-1.5 text-sm sm:text-base px-3 sm:px-4">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">新規作成</span><span className="sm:hidden">新規</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-5 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="input pl-9" placeholder="タイトル・現場名・顧客名で検索"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">すべてのステータス</option>
          {Object.entries(STATUS_MAP).map(([v, s]) => (
            <option key={v} value={v}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <Clock className="h-10 w-10 mx-auto mb-3 animate-spin opacity-30" />
            読み込み中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">見積もりがありません</p>
            {search || statusFilter !== 'all' ? (
              <p className="text-sm mt-1">条件を変更して検索してください</p>
            ) : (
              <Link href="/estimates/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                最初の見積もりを作成する
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* デスクトップ用テーブル */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-12 px-4 py-3 text-xs text-gray-400 font-medium border-b border-gray-100 uppercase">
                <div className="col-span-4">タイトル / 現場名</div>
                <div className="col-span-2">顧客名</div>
                <div className="col-span-1 text-center">品目数</div>
                <div className="col-span-2 text-right">合計金額（税込）</div>
                <div className="col-span-1 text-center">ステータス</div>
                <div className="col-span-1 text-center">作成日</div>
                <div className="col-span-1"></div>
              </div>
              <div className="divide-y divide-gray-50">
                {filtered.map(est => {
                  const status = STATUS_MAP[est.status] || STATUS_MAP.draft
                  const totalWithTax = est.total_amount * (1 + est.tax_rate)
                  return (
                    <div key={est.id} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-gray-50 transition-colors group">
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          {est.status === 'approved' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : est.status === 'completed' ? (
                            <FileText className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileEdit className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/estimates/${est.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600 truncate block">
                            {est.title}
                          </Link>
                          {est.project_name && (
                            <p className="text-xs text-gray-400 truncate">{est.project_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 text-sm text-gray-600 truncate">{est.customer_name || '—'}</div>
                      <div className="col-span-1 text-center text-sm text-gray-600">{est.item_count}</div>
                      <div className="col-span-2 text-right font-semibold text-gray-900">
                        {formatCurrency(totalWithTax)}
                      </div>
                      <div className="col-span-1 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
                      </div>
                      <div className="col-span-1 text-center text-xs text-gray-400">{formatDate(est.created_at)}</div>
                      <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/estimates/${est.id}`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                        <button onClick={() => handleDelete(est.id, est.title)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* モバイル用カード表示 */}
            <div className="sm:hidden divide-y divide-gray-100">
              {filtered.map(est => {
                const status = STATUS_MAP[est.status] || STATUS_MAP.draft
                const totalWithTax = est.total_amount * (1 + est.tax_rate)
                return (
                  <Link key={est.id} href={`/estimates/${est.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      {est.status === 'approved' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : est.status === 'completed' ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <FileEdit className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">{est.title}</p>
                      <p className="text-gray-400 text-xs truncate">{est.customer_name || est.project_name || '—'}</p>
                      <p className="text-gray-400 text-xs">{formatDate(est.created_at)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-gray-900 text-sm">{formatCurrency(totalWithTax)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
