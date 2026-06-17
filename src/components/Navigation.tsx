'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, FileText, Tag, History, Zap, BookOpen, CreditCard, LogOut, User, ClipboardList, Menu, X } from 'lucide-react'

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
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setMe(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const NavLinks = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      <div className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-700 text-white border-r-4 border-yellow-400'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {me?.role === 'admin' && (
          <Link
            href="/admin/login-logs"
            onClick={onItemClick}
            className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
              pathname.startsWith('/admin')
                ? 'bg-blue-700 text-white border-r-4 border-yellow-400'
                : 'text-blue-200 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <ClipboardList className="h-5 w-5 flex-shrink-0" />
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
    </>
  )

  return (
    <>
      {/* デスクトップ用サイドバー (lg以上) */}
      <nav className="hidden lg:flex bg-blue-900 text-white w-64 min-h-screen flex-col flex-shrink-0">
        <div className="p-6 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-yellow-400" />
            <div>
              <h1 className="font-bold text-lg leading-tight">電工見積もり</h1>
              <p className="text-blue-300 text-xs">電気工事見積システム</p>
            </div>
          </div>
        </div>
        <NavLinks />
      </nav>

      {/* モバイル用トップバー (lg未満) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-blue-900 text-white h-14 flex items-center px-4 shadow-lg">
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="p-2 rounded-lg hover:bg-blue-800 transition-colors mr-2"
          aria-label="メニューを開く"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Zap className="h-5 w-5 text-yellow-400 mr-1.5 flex-shrink-0" />
        <span className="font-bold text-sm truncate">電工見積もりシステム</span>
        {me && (
          <div className="ml-auto flex items-center gap-1.5 text-blue-300 text-xs flex-shrink-0">
            <User className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{me.displayName || me.username}</span>
          </div>
        )}
      </div>

      {/* モバイル用ドロワーメニュー */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <nav
            className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-blue-900 text-white flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-14 flex items-center px-5 border-b border-blue-800 gap-2">
              <Zap className="h-6 w-6 text-yellow-400 flex-shrink-0" />
              <div>
                <h1 className="font-bold text-base leading-tight">電工見積もり</h1>
                <p className="text-blue-300 text-xs">電気工事見積システム</p>
              </div>
            </div>
            <NavLinks onItemClick={() => setMobileOpen(false)} />
          </nav>
        </div>
      )}
    </>
  )
}
