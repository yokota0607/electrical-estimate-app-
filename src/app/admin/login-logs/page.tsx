'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, LogIn, LogOut, Shield } from 'lucide-react'

interface Log {
  id: number
  user_id: number | null
  username: string
  action: string
  ip_address: string
  created_at: string
}

export default function LoginLogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/login-logs')
      .then(r => {
        if (r.status === 403) throw new Error('権限がありません（管理者のみ）')
        return r.json()
      })
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ログイン履歴</h2>
          <p className="text-gray-500 text-sm mt-1">ログイン・ログアウトの記録（管理者専用）</p>
        </div>
      </div>

      {error && (
        <div className="card p-6 text-center text-red-600">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{error}</p>
        </div>
      )}

      {!error && (
        <div className="card">
          {loading ? (
            <div className="p-8 text-center text-gray-400">読み込み中...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>ログイン履歴がありません</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-4 px-5 py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    log.action === 'login' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {log.action === 'login'
                      ? <LogIn className="h-4 w-4 text-green-600" />
                      : <LogOut className="h-4 w-4 text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{log.username}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        log.action === 'login' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {log.action === 'login' ? 'ログイン' : 'ログアウト'}
                      </span>
                    </div>
                    {log.ip_address && (
                      <p className="text-xs text-gray-400 mt-0.5">IP: {log.ip_address}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">{log.created_at}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
