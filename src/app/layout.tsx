import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '電工見積もりシステム',
  description: '電気工事会社向け見積もり管理システム',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || '/'
  const showNav = !pathname.startsWith('/login')

  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-50`}>
        <div className="flex min-h-screen">
          {showNav && <Navigation />}
          <main className={`flex-1 overflow-auto${showNav ? ' pt-14 lg:pt-0' : ''}`}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
