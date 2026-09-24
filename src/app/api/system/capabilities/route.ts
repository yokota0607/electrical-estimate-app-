export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
  })
}
