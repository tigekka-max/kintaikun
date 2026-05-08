# 稼働管理 PWA

業務委託メンバーのシフト提出、案件割当、交通費申請、月次精算を管理するNext.js + Supabaseアプリです。

## ローカル起動

```bash
npm.cmd install
npm.cmd run dev
```

PowerShellで `npm` が実行ポリシーに止められる場合は `npm.cmd` を使います。

## Supabaseセットアップ

1. Supabaseで新規プロジェクトを作成
2. SQL Editorで `supabase/schema.sql` を実行
3. Authentication > Users で最初の管理者ユーザーを作成
4. 作成したユーザーの UUID を使って `supabase/first-admin.sql` を編集して実行
5. `.env.example` を参考に `.env.local` を作成

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
```

6. 開発サーバーを再起動

## 現在の状態

- Supabase環境変数が未設定の場合はデモ画面に遷移できます。
- 環境変数を設定すると、ログイン画面でSupabase Authを使います。
- 画面内の一覧データはまだモックです。
- 次の工程でシフト提出、案件、割当、交通費、精算をSupabaseデータに差し替えます。
