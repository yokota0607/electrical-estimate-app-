import Anthropic from '@anthropic-ai/sdk'

// Lazy initialization: new Anthropic() throws at construction time if
// ANTHROPIC_API_KEY is undefined — crashing the Next.js build worker.
// By deferring to first use, the build phase safely imports this module.
let _client: Anthropic | undefined

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

export interface ExtractedConstructionInfo {
  project_name: string
  client_name: string
  location: string
  contract_amount: number | null
  start_date: string
  completion_date: string
  description: string
  confidence: 'high' | 'medium' | 'low'
}

const ESTIMATE_DOC_PROMPT = `あなたは建設・電気工事の専門家です。添付された見積書（PDFまたは画像）を分析し、工事台帳登録に必要な情報を抽出してください。

必ず以下のJSON形式のみで回答してください（他のテキストは不要）：
{
  "project_name": "工事名・件名（見つからない場合は空文字）",
  "client_name": "発注者・顧客名（見つからない場合は空文字）",
  "location": "工事場所・施工場所（見つからない場合は空文字）",
  "contract_amount": 契約金額（数値・税込みを優先、見つからない場合はnull）,
  "start_date": "着工日（YYYY-MM-DD形式、見つからない場合は空文字）",
  "completion_date": "完成日（YYYY-MM-DD形式、見つからない場合は空文字）",
  "description": "工事内容の概要（1〜3文、見つからない場合は空文字）",
  "confidence": "high または medium または low（抽出全体の確信度）"
}

注意：
- 合計金額は税込みを優先。税込みが明記されていない場合は税抜き金額を使用。
- 日付は和暦を西暦に変換（例：令和6年4月1日→2024-04-01）。
- 見積書以外の文書はすべて空文字/nullにしてください。`

export type EstimateDocMediaType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif'

export async function analyzeEstimateDocument(
  fileBase64: string,
  mediaType: EstimateDocMediaType,
): Promise<ExtractedConstructionInfo> {
  const fileBlock =
    mediaType === 'application/pdf'
      ? ({
          type: 'document',
          source: { type: 'base64', media_type: mediaType, data: fileBase64 },
        } as { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } })
      : ({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: fileBase64 },
        } as { type: 'image'; source: { type: 'base64'; media_type: Exclude<EstimateDocMediaType, 'application/pdf'>; data: string } })

  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          fileBlock,
          { type: 'text', text: ESTIMATE_DOC_PROMPT },
        ],
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const jsonMatch = content.text.trim().match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('JSONレスポンスが見つかりませんでした')

  return JSON.parse(jsonMatch[0]) as ExtractedConstructionInfo
}

export interface ExtractedMaterial {
  name: string
  category: string
  quantity: number
  unit: string
  notes: string
}

export interface ExtractionResult {
  materials: ExtractedMaterial[]
  summary: string
}

const EXTRACTION_PROMPT = `あなたは電気工事の専門家です。添付された電気工事図面（PDF）を詳しく分析し、必要な材料の拾い出しを行ってください。

以下の手順で作業してください：
1. 図面に記載されている電気設備・材料をすべて特定する
2. 各材料の数量を数える
3. 以下のJSON形式で回答する

必ず以下のJSON形式のみで回答してください（他のテキストは不要）：
{
  "materials": [
    {
      "name": "材料名（具体的に）",
      "category": "カテゴリ",
      "quantity": 数量（数値）,
      "unit": "単位",
      "notes": "備考・仕様"
    }
  ],
  "summary": "図面の概要（1〜2文）"
}

カテゴリは以下から最適なものを選んでください：
- 電線・ケーブル
- 配管・電線管
- 照明器具
- コンセント・スイッチ
- 分電盤・ブレーカー
- 動力設備
- 通信・弱電設備
- 接地工事
- 電気工事材料
- その他

単位例：m、本、個、台、組、式、ヶ所

図面が不鮮明な場合や判読困難な場合は、読み取れる範囲で最善の推定を行い、notesに「要確認」と記載してください。
PDFが電気図面でない場合は materials を空配列にして summary にその旨を記載してください。`

export interface ExtractedBusinessCard {
  name: string
  company: string
  department: string
  title: string
  email: string
  phone: string
  mobile: string
  address: string
  website: string
}

const BUSINESS_CARD_SCAN_PROMPT = `あなたは名刺読み取りの専門家です。添付された画像（A3スキャンなど）に含まれるすべての名刺を解析し、各名刺の情報を抽出してください。

必ず以下のJSON形式のみで回答してください（他のテキストは不要）：
{
  "cards": [
    {
      "name": "氏名（見つからない場合は空文字）",
      "company": "会社名（見つからない場合は空文字）",
      "department": "部署名（見つからない場合は空文字）",
      "title": "役職名（見つからない場合は空文字）",
      "email": "メールアドレス（見つからない場合は空文字）",
      "phone": "電話番号（見つからない場合は空文字）",
      "mobile": "携帯番号（見つからない場合は空文字）",
      "address": "住所（見つからない場合は空文字）",
      "website": "WebサイトURL（見つからない場合は空文字）"
    }
  ]
}

注意：
- 画像内の名刺を1枚ずつ丁寧に読み取り、すべての名刺を配列に含めてください。
- 電話番号は記載通りに入力（ハイフンあり・なし問わず）。
- 名刺が見つからない場合は cards を空配列にしてください。`

export async function analyzeBusinessCardScan(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<ExtractedBusinessCard[]> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          } as { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string } },
          { type: 'text', text: BUSINESS_CARD_SCAN_PROMPT },
        ],
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

  const jsonMatch = content.text.trim().match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('JSONレスポンスが見つかりませんでした')

  const result = JSON.parse(jsonMatch[0]) as { cards: ExtractedBusinessCard[] }
  return result.cards ?? []
}

export async function analyzePDF(pdfBase64: string): Promise<ExtractionResult> {
  const response = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          } as { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } },
          {
            type: 'text',
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const text = content.text.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('JSONレスポンスが見つかりませんでした')
  }

  const result = JSON.parse(jsonMatch[0]) as ExtractionResult
  return result
}
