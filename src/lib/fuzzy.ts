// 品名・品番の表記ゆれを吸収してファジーマッチングするための共通ロジック。
// 単価表への「テキサスCSV取り込み」と、公開検索API（unit-prices-search）の
// 両方から利用する。過去にPythonで作った「品番マッチング」スクリプトと同じ考え方
// （正規化 → 完全一致 → 品名の類似度マッチング）を踏襲している。

/**
 * 文字列を比較用に正規化する。
 * - NFKC 正規化：全角英数・記号→半角、半角カナ→全角カナ を吸収
 * - 空白（全角スペース含む）をすべて除去
 * - 小文字化
 * - よくある区切り記号（・, -, /, （）, [] など）を除去
 */
export function normalizeText(raw: string | null | undefined): string {
  if (!raw) return ''
  return String(raw)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　]+/g, '')
    .replace(/[・･,，.。/／\\|()（）\[\]「」『』{}<>＜＞~〜\-ー_'"’”`]/g, '')
    .trim()
}

/** レーベンシュタイン距離（編集距離） */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, prevDiag + cost)
      prevDiag = tmp
    }
  }
  return prev[b.length]
}

/**
 * 2つの文字列の類似度（0〜1）を返す。正規化した上で
 * 編集距離ベースの類似度と、包含関係のボーナスを合成する。
 * 1.0 = 正規化後に完全一致。
 */
export function similarity(a: string | null | undefined, b: string | null | undefined): number {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  const dist = levenshtein(na, nb)
  let score = 1 - dist / maxLen
  // 片方がもう片方を完全に含む場合（例: 略称・付帯情報の有無）はボーナス
  if (na.includes(nb) || nb.includes(na)) {
    const contained = Math.min(na.length, nb.length) / maxLen
    score = Math.max(score, 0.6 + contained * 0.4)
  }
  return Math.max(0, Math.min(1, score))
}

export interface Matchable {
  id: number
  name: string
  part_number: string
  price: number
  [key: string]: unknown
}

export type MatchType = 'exact_part' | 'exact_name' | 'fuzzy_name' | 'none'

export interface MatchResult<T extends Matchable> {
  candidate: T | null
  matchType: MatchType
  /** 類似度スコア（0〜1）。完全一致は 1。 */
  score: number
}

// この値以上を「自動反映してよい信頼度が高いマッチ」とみなす。
export const HIGH_CONFIDENCE = 0.85
// この値未満は「別物の可能性が高い」としてマッチ扱いにしない（未登録品目へ）。
export const MATCH_THRESHOLD = 0.6

/**
 * 対象品（品番・品名）を既存レコード群に照合する。
 * 1) 品番の完全一致（正規化後）
 * 2) 品名の完全一致（正規化後）
 * 3) 品名のファジー一致（最も類似度の高い候補）
 */
export function matchOne<T extends Matchable>(
  target: { part_number?: string; name?: string },
  existing: T[]
): MatchResult<T> {
  const tPart = normalizeText(target.part_number)
  const tName = normalizeText(target.name)

  // 1) 品番の完全一致
  if (tPart) {
    const hit = existing.find(e => normalizeText(e.part_number) === tPart)
    if (hit) return { candidate: hit, matchType: 'exact_part', score: 1 }
  }

  // 2) 品名の完全一致
  if (tName) {
    const hit = existing.find(e => normalizeText(e.name) === tName)
    if (hit) return { candidate: hit, matchType: 'exact_name', score: 1 }
  }

  // 3) 品名のファジー一致（最良候補）
  if (tName) {
    let best: T | null = null
    let bestScore = 0
    for (const e of existing) {
      const s = similarity(target.name, e.name)
      if (s > bestScore) { bestScore = s; best = e }
    }
    if (best && bestScore >= MATCH_THRESHOLD) {
      return { candidate: best, matchType: 'fuzzy_name', score: bestScore }
    }
  }

  return { candidate: null, matchType: 'none', score: 0 }
}
