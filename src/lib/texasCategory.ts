// テキサス（TEXUSS）の「商品区分」コード＋品名から、単価表のカテゴリを決める。
// 商品区分は A=電線, B/C=電線管・付属品, D=盤・ブレーカー, E=配線器具・材料,
// F=受変電・計器, G=照明, I=工具・雑, K/L/M=空調・換気, N/O=弱電・事務 のように並んでいる。

export function texasCategory(code: string, name: string): string {
  const c = (code || '').trim().toUpperCase()
  const n = (name || '').normalize('NFKC')

  if (/送料|運賃/.test(n)) return 'その他'
  if (/接地棒|アース棒|接地銅板|接地極|接地抵抗|アースボンド/.test(n)) return '接地工事'

  const head = c.charAt(0)
  switch (head) {
    case 'A':
      if (c === 'A50') return '電気工事材料' // 端末処理材など
      if (/OP線|通信|LAN|同軸|UTP/i.test(n)) return '通信・弱電設備'
      return '電線・ケーブル'
    case 'B':
    case 'C':
      return '配管・電線管'
    case 'D':
      if (c === 'D02') return '動力設備' // 電磁開閉器・押釦など
      if (c === 'D50') return '高圧受電設備'
      if (/動力盤/.test(n)) return '動力設備'
      if (/高圧|進相|コンデンサ|ガイシ|碍子/.test(n)) return '高圧受電設備'
      return '分電盤・ブレーカー'
    case 'E':
      if (/ライティング|レール|ショップライン/.test(n)) return '照明器具'
      if (/ダクト|マガリ|モール|ジョイントカバー|固定バンド/.test(n) || /^エンド\s/.test(n)) return '配管・電線管'
      if (/モジュラ|ジャック|LAN|TV端子|テレビ端子|電話/i.test(n)) return '通信・弱電設備'
      if (/コンセント|スイッチ|SW|プレ[ー−-]?ト|ほたる|ホタル|調光|チャイム|パイロット|取付枠|取り付け枠|埋込|接地ダ|チップ/i.test(n)) return 'コンセント・スイッチ'
      return '電気工事材料'
    case 'F':
      if (c === 'F07' || /火災|警報/.test(n)) return '通信・弱電設備'
      if (/タイム|タイマ|24H|キヨウヤク/.test(n)) return '動力設備'
      return '高圧受電設備'
    case 'G':
      return '照明器具'
    case 'K':
    case 'L':
    case 'M':
      return '空調・換気設備'
    case 'N':
      return '通信・弱電設備'
    case 'I':
      if (c === 'I01' || c === 'I02' || c === 'I50') return '工具・計測器'
      return 'その他'
    case 'O':
      return 'その他'
  }
  return '電気工事材料'
}

// テキサスの単位表記（全角「ｍ」など）を単価表の単位にそろえる
export function texasUnit(unit: string): string {
  const u = (unit || '').normalize('NFKC').trim()
  if (!u) return '個'
  if (u === 'm' || u === 'M') return 'm'
  if (u === 'S') return 'セット'
  return u
}
