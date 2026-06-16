# 電工見積もりシステム

電気工事会社向け 見積もり管理Webアプリ

## セットアップ手順

### 1. Claude APIキーの設定

`.env.local` を編集してAPIキーを入力してください：
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
```
APIキーは https://console.anthropic.com から取得できます。

### 2. 起動

```powershell
$env:PATH = "C:\Users\admin\node-v22.16.0-win-x64;$env:PATH"
cd C:\Users\admin\electrical-estimate-app
npm run dev        # 開発モード
# または
npm run build && npm run start   # 本番モード
```

ブラウザで `http://localhost:3000` を開く。
社員共有は `http://[サーバーIP]:3000` でアクセス。

## 機能

1. PDF図面をアップロード → AIが材料を自動拾い出し
2. 単価表の登録・管理（カテゴリ別）
3. 拾い出し材料と単価を照合して概算見積もりを自動計算
4. 見積もり履歴の保存・蓄積・検索
5. ブラウザ共有（社員全員がアクセス可能）

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
