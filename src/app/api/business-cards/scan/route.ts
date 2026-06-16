import { NextRequest, NextResponse } from 'next/server'
import { analyzeBusinessCardScan } from '@/lib/claude'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
type AllowedType = typeof ALLOWED_TYPES[number]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: '画像ファイルが必要です' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type as AllowedType)) {
      return NextResponse.json({ error: 'JPEG・PNG・WebP形式の画像のみアップロード可能です' }, { status: 400 })
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'ファイルサイズは20MB以下にしてください' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const cards = await analyzeBusinessCardScan(base64, file.type as AllowedType)

    return NextResponse.json({ cards })
  } catch (error) {
    console.error('Business card scan error:', error)
    const message = error instanceof Error ? error.message : '名刺スキャン中にエラーが発生しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
