'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Loader2, Tag } from 'lucide-react'

interface IndustryGroup {
  id: number
  name: string
  sort_order: number
}

export default function IndustryGroupsPage() {
  const [groups, setGroups] = useState<IndustryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState('')

  const load = () =>
    fetch('/api/industry-groups')
      .then(r => r.json())
      .then(data => setGroups(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true); setAddError('')
    try {
      const res = await fetch('/api/industry-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error || '登録に失敗しました'); return }
      setNewName(''); load()
    } finally { setAdding(false) }
  }

  const handleEdit = async (id: number) => {
    if (!editName.trim()) return
    setEditError('')
    try {
      const res = await fetch(`/api/industry-groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error || '更新に失敗しました'); return }
      setEditingId(null); load()
    } catch { setEditError('更新に失敗しました') }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？\n名刺データには影響しません。`)) return
    await fetch(`/api/industry-groups/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">業種グループ管理</h2>
        <p className="text-gray-500 text-sm mt-1">名刺管理で使用する業種グループを管理します</p>
      </div>

      {/* 追加フォーム */}
      <div className="card p-5 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">新しい業種を追加</h3>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="業種名を入力（例: 電気工事）"
            value={newName}
            onChange={e => { setNewName(e.target.value); setAddError('') }}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            追加
          </button>
        </div>
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
      </div>

      {/* 業種一覧 */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-30" />
            読み込み中...
          </div>
        ) : groups.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Tag className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p>業種グループがありません</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groups.map(g => (
              <div key={g.id} className="flex items-center gap-3 px-5 py-3 group">
                <Tag className="h-4 w-4 text-green-500 flex-shrink-0" />
                {editingId === g.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      className="input flex-1 py-1 text-sm"
                      value={editName}
                      onChange={e => { setEditName(e.target.value); setEditError('') }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleEdit(g.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                    />
                    <button onClick={() => handleEdit(g.id)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="p-1.5 text-gray-400 hover:bg-gray-50 rounded">
                      <X className="h-4 w-4" />
                    </button>
                    {editError && <span className="text-xs text-red-600 self-center">{editError}</span>}
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-800">{g.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(g.id); setEditName(g.name); setEditError('') }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id, g.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
