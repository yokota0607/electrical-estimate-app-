import { NextRequest, NextResponse } from 'next/server'
import { analyzeEstimateDocument, EstimateDocMediaType } from '@/lib/claude'

const ALLOWED_TYPES: EstimateDocMediaType[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type as EstimateDocMediaType)) {
      return NextResponse.json(
        { error: 'PDF・画像（JPEG/PNG/WebP）のみアップロード可能です' },
        { status: 400 },
      )
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'ファイルサイズは20MB以下にしてください' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const result = await analyzeEstimateDocument(base64, file.type as EstimateDocMediaType)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Estimate doc analysis error:', error)
    const message = error instanceof Error ? error.message : '分析中にエラーが発生しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
