'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, FileText, Tag, History, Zap, BookOpen, CreditCard, LogOut, User, ClipboardList } from 'lucide-react'

const navItems = [
  { href: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/estimates/new', label: '新規見積もり', icon: FileText },
  { href: '/estimates', label: '見積もり履歴', icon: History },
  { href: '/construction-ledger', label: '工事台帳', icon: BookOpen },
  { href: '/unit-prices', label: '単価表管理', icon: Tag },
  { href: '/business-cards', label: '名刺管理', icon: CreditCard },
]

interface Me { username: string; displayName: string; role: string }

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setMe(data))
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-blue-900 text-white w-64 min-h-screen flex flex-col">
      <div className="p-6 border-b border-blue-800">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-yellow-400" />
          <div>
            <h1 className="font-bold text-lg leading-tight">電工見積もり</h1>
            <p className="text-blue-300 text-xs">電気工事見積システム</p>
          </div>
        </div>
      </div>

      <div className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-700 text-white border-r-4 border-yellow-400'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}

        {me?.role === 'admin' && (
          <Link
            href="/admin/login-logs"
            className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
              pathname.startsWith('/admin')
                ? 'bg-blue-700 text-white border-r-4 border-yellow-400'
                : 'text-blue-200 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <ClipboardList className="h-5 w-5" />
            ログイン履歴
          </Link>
        )}
      </div>

      <div className="p-4 border-t border-blue-800">
        {me ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-200 text-xs">
              <User className="h-4 w-4 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{me.displayName || me.username}</p>
                <p className="text-blue-400 text-xs">{me.role === 'admin' ? '社長' : '事務員'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 text-blue-300 hover:text-white hover:bg-blue-800 text-xs px-2 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              ログアウト
            </button>
          </div>
        ) : (
          <p className="text-blue-400 text-xs text-center">社内共有システム</p>
        )}
      </div>
    </nav>
  )
}
