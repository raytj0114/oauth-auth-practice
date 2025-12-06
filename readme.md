# OAuth Authentication Practice

OAuth 2.0 とメール/パスワード認証の実装練習プロジェクト

## 機能

- ✅ メール/パスワード認証
- ✅ GitHub OAuth
- ✅ Google OAuth
- ✅ セッション管理 (PostgreSQL)
- ✅ ユーザープロフィール
- ✅ 設定管理
- ✅ PostgreSQL データベース
- ✅ EJS テンプレートエンジン
- ✅ レスポンシブデザイン
- ✅ セキュリティヘッダー (Helmet)
- ✅ レート制限
- ✅ CSRF 対策

## ドキュメント

- **OAuth を学ぶ**: [OAuth 2.0 完全ガイド](./docs/OAUTH_GUIDE.md) - 基礎から実装まで
- **システム設計**: [Architecture](./ARCHITECTURE.md) - 技術的な設計詳細
- **データベース**: [Database](./DATABASE.md) - PostgreSQL の設計と運用

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. PostgreSQL の起動

Docker を使用して PostgreSQL を起動します:

```bash
# PostgreSQL起動
docker-compose up -d

# 起動確認
docker-compose ps

# ログ確認
docker-compose logs postgres
```

**Docker コマンド:**

- `docker-compose up -d`: バックグラウンドで起動
- `docker-compose down`: 停止
- `docker-compose down -v`: 停止 + データ削除
- `docker-compose logs -f postgres`: ログをリアルタイム表示

### 3. 環境変数の設定

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

`.env` を編集:

```env
PORT=3000
NODE_ENV=development

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Session
SESSION_MAX_AGE=86400000

# CSRF（本番環境では必ず設定）
CSRF_SECRET=your_csrf_secret_here

# Database
USE_DATABASE=true
DATABASE_URL=postgresql://oauth_user:oauth_password@localhost:5432/oauth_practice
```

**USE_DATABASE の設定:**

- `true`: PostgreSQL を使用(推奨)
- `false`: メモリを使用(テスト用)

### 4. OAuth App の作成

#### GitHub

1. https://github.com/settings/developers
2. "New OAuth App"
3. Callback URL: `http://localhost:3000/auth/github/callback`

#### Google

1. https://console.cloud.google.com/
2. OAuth 2.0 クライアント ID を作成
3. リダイレクト URI: `http://localhost:3000/auth/google/callback`

### 5. サーバー起動

```bash
npm run dev
```

http://localhost:3000 にアクセス

## プロジェクト構造

```
src/
├── auth/
│   ├── stores/
│   │   ├── UserRepository.js              # メモリ版 UserRepository
│   │   ├── AuthRepository.js              # メモリ版 AuthRepository
│   │   ├── MemorySessionRepository.js     # メモリ版 SessionRepository
│   │   ├── RepositoryFactory.js           # Repository 切り替え
│   │   └── postgres/
│   │       ├── PostgresUserRepository.js      # PostgreSQL版 UserRepository
│   │       ├── PostgresAuthRepository.js      # PostgreSQL版 AuthRepository
│   │       └── PostgresSessionRepository.js   # PostgreSQL版 SessionRepository
│   ├── providers/
│   │   ├── GitHubProvider.js              # GitHub OAuth
│   │   └── GoogleProvider.js              # Google OAuth
│   ├── UnifiedAuthService.js              # 認証ビジネスロジック
│   ├── AuthManager.js                     # OAuth フロー管理
│   └── SessionManager.js                  # セッション管理
├── database/
│   └── connection.js                      # PostgreSQL 接続プール
├── middleware/
│   ├── auth.js                            # 認証ミドルウェア
│   ├── csrf.js                            # CSRF ミドルウェア
│   └── viewHelpers.js                     # ビューヘルパー
└── routes/
    ├── auth.js                            # OAuth ルート
    ├── local-auth.js                      # メール/パスワード ルート
    └── protected.js                       # 保護されたルート

views/
├── layouts/
│   └── main.ejs                           # 共通レイアウト
├── partials/
│   ├── header.ejs                         # ヘッダー
│   └── footer.ejs                         # フッター
├── auth/
│   ├── signin.ejs                         # サインインページ
│   └── signup.ejs                         # サインアップページ
├── home.ejs                               # ホームページ
├── profile.ejs                            # プロフィールページ
└── error.ejs                              # エラーページ

public/
├── css/
│   └── style.css                          # スタイルシート
└── js/
    └── main.js                            # クライアント側 JavaScript
```

## アーキテクチャ

このプロジェクトは**Repository パターン**、**Factory パターン**、**MVC パターン**を採用しています。

### データ層の分離

```
┌─────────────────────┐
│  UserRepository     │  ← ユーザー情報(プロフィール、設定)
└─────────────────────┘
         ↕ userId
┌─────────────────────┐
│  AuthRepository     │  ← 認証情報(パスワード、OAuth連携)
└─────────────────────┘
         ↕ userId
┌─────────────────────┐
│  SessionRepository  │  ← セッション情報
└─────────────────────┘
```

### ストレージの切り替え

```
RepositoryFactory
    ↓
USE_DATABASE=true  → PostgreSQL Repository
USE_DATABASE=false → Memory Repository
```

環境変数を変更するだけで、メモリとデータベースを簡単に切り替えられます。

### MVC パターン

```
View (EJS)
   ↓
Controller (Routes)
   ↓
Service (UnifiedAuthService)
   ↓
Repository (Data Access)
   ↓
Model (PostgreSQL / Memory)
```

詳細は [ARCHITECTURE.md](./ARCHITECTURE.md) を参照してください。

## UI/UX

### デザインシステム

- **CSS Variables**: 一貫したカラーパレット
- **レスポンシブデザイン**: モバイルファーストアプローチ
- **アニメーション**: スムーズなトランジション
- **アクセシビリティ**: セマンティック HTML、適切なコントラスト

### ページ一覧

1. **ホームページ** (`/`)

   - OAuth ログインボタン
   - メール/パスワードログインリンク
   - ログイン状態の表示

2. **サインアップ** (`/local/signup`)

   - ユーザー名、メール、パスワード入力
   - クライアント側バリデーション
   - OAuth オプション

3. **サインイン** (`/local/signin`)

   - メール、パスワード入力
   - エラーメッセージ表示
   - OAuth オプション

4. **プロフィール** (`/profile`)
   - ユーザー情報表示
   - リンクされたアカウント
   - 設定変更フォーム
   - ログアウト

## 認証パターン

### 現在の実装: パターン 1 (別アカウント)

同じメールアドレスでも、OAuth とローカル認証は**別アカウント**として扱われます。

**例:**

```
user@example.com でメール/パスワード登録 → アカウントA
user@example.com で Google ログイン      → アカウントB (別アカウント)
```

**理由:**

- セキュリティリスクの回避
- メールアドレス乗っ取り攻撃の防止
- 主要サービス(Claude, Slack, Discord 等)と同じパターン

詳細は [ARCHITECTURE.md](./ARCHITECTURE.md) の「認証パターン」を参照してください。

---

## セキュリティ

このアプリケーションには以下のセキュリティ機能が実装されています。

### セキュリティヘッダー (Helmet)

```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

### レート制限

| エンドポイント  | 制限         | 説明                     |
| --------------- | ------------ | ------------------------ |
| 全体            | 100 回/15 分 | 一般的なリクエスト制限   |
| `/local/signin` | 10 回/15 分  | ブルートフォース攻撃対策 |
| `/local/signup` | 10 回/15 分  | スパム登録対策           |
| `/auth/*`       | 10 回/15 分  | OAuth 乱用対策           |

※開発環境 (`NODE_ENV=development`) ではレート制限はスキップされます。

### CSRF 対策

Double Submit Cookie パターンを使用：

1. サーバーが CSRF トークンを生成
2. トークンを Cookie (`__csrf`) に保存
3. フォームの hidden フィールド (`_csrf`) にも埋め込む
4. POST 送信時、両者を比較
5. 一致すれば正当なリクエスト

### Cookie 設定

```javascript
{
  httpOnly: true,      // JavaScript からアクセス不可
  secure: true,        // HTTPS のみ（本番環境）
  sameSite: 'lax',     // クロスサイトリクエストで送信されない
  maxAge: 86400000     // 24時間
}
```

### 入力バリデーション

| フィールド   | ルール                                           |
| ------------ | ------------------------------------------------ |
| Email        | 正規表現による形式チェック、小文字正規化         |
| Password     | 6〜128 文字                                      |
| Username     | 3〜50 文字、英数字・アンダースコア・ハイフンのみ |
| 全フィールド | 最大 255 文字、前後の空白をトリム                |

### その他のセキュリティ対策

- ✅ パスワードは bcrypt でハッシュ化(saltRounds=10)
- ✅ セッションは HttpOnly Cookie
- ✅ セッションは PostgreSQL に永続化
- ✅ CSRF 対策(State パラメータ + Double Submit Cookie)
- ✅ パラメータ化クエリ(SQL インジェクション対策)
- ✅ トランザクションでデータ整合性を保証
- ✅ パスワードハッシュは外部に公開しない
- ✅ OAuth アクセストークンは使い捨て(保存しない)
- ✅ XSS 対策(EJS の自動エスケープ)

---

## 環境変数

### 必須の環境変数

```bash
# サーバー設定
PORT=3000
NODE_ENV=production

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=https://your-domain.com/auth/github/callback

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback

# セキュリティ
CSRF_SECRET=your_csrf_secret_here

# セッション
SESSION_MAX_AGE=86400000
```

### データベース設定（PostgreSQL 使用時）

```bash
USE_DATABASE=true
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

### シークレットの生成方法

```bash
# CSRF_SECRET の生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 本番環境へのデプロイ

### 事前準備

1. **GitHub OAuth App の作成**

   - https://github.com/settings/developers
   - Authorization callback URL: `https://your-domain.com/auth/github/callback`

2. **Google OAuth Client の作成**

   - https://console.cloud.google.com
   - 承認済みリダイレクト URI: `https://your-domain.com/auth/google/callback`

3. **PostgreSQL データベースの準備**（任意）
   - 多くの PaaS で自動提供

### Render へのデプロイ（推奨）

1. https://render.com でアカウント作成
2. New > Web Service
3. GitHub リポジトリを接続
4. 設定:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Environment Variables を設定
6. Create Web Service

**注意**: Render の無料枠は 15 分間アクセスがないとスリープします。GitHub Actions でスリープを防ぐことができます。

### Railway へのデプロイ

```bash
# 1. Railway CLI のインストール
npm install -g @railway/cli

# 2. ログイン
railway login

# 3. プロジェクト作成
railway init

# 4. 環境変数の設定
railway variables set NODE_ENV=production
railway variables set GITHUB_CLIENT_ID=xxx
# ... 他の環境変数も同様に設定

# 5. デプロイ
railway up
```

### ヘルスチェック

アプリケーションの状態を確認できます：

```bash
curl https://your-domain.com/health
```

レスポンス例：

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production",
  "storage": "postgres"
}
```

---

## 開発

### 使用可能なコマンド

```bash
# 開発モード(ファイル監視付き)
npm run dev

# 本番モード
npm start
```

### デバッグエンドポイント(開発環境のみ)

```bash
# ストレージ状態の確認
GET http://localhost:3000/debug

# データベースのリセット(PostgreSQL のみ)
POST http://localhost:3000/debug/reset

# サンプルデータの作成
POST http://localhost:3000/debug/seed
```

### データベース管理

```bash
# PostgreSQL に接続
docker-compose exec postgres psql -U oauth_user -d oauth_practice

# テーブル一覧
\dt

# ユーザー確認
SELECT * FROM users;

# 認証情報確認
SELECT * FROM authentications;

# セッション確認
SELECT * FROM sessions;

# テーブル削除(開発用)
TRUNCATE users RESTART IDENTITY CASCADE;
TRUNCATE authentications RESTART IDENTITY CASCADE;
TRUNCATE sessions RESTART IDENTITY CASCADE;

# 終了
\q
```

## データベース

### PostgreSQL (推奨)

本番環境を想定した実装:

- コネクションプール
- トランザクション対応
- JSONB 型でフレキシブルなデータ構造
- インデックスで高速検索
- セッション永続化

### メモリ (開発・テスト用)

軽量で高速:

- セットアップ不要
- テストに最適
- サーバー再起動でデータ消失

### 切り替え方法

```bash
# .env ファイルで変更
USE_DATABASE=true   # PostgreSQL
USE_DATABASE=false  # メモリ
```

## テンプレートエンジン

### EJS の特徴

- **シンプル**: JavaScript の構文をそのまま使える
- **パーシャル**: 再利用可能なコンポーネント
- **レイアウト**: 共通レイアウトの継承
- **自動エスケープ**: XSS 対策

### テンプレートの構造

```
layouts/main.ejs       ← 共通レイアウト
   ↓ include
partials/header.ejs    ← ヘッダー
partials/footer.ejs    ← フッター
   ↓ body
home.ejs              ← 各ページ
profile.ejs
auth/signin.ejs
```

## 学習ポイント

このプロジェクトで学べること:

1. OAuth 2.0 認可コードフロー
2. パスワード認証とハッシュ化
3. セッション管理 (PostgreSQL)
4. Repository パターン
5. Factory パターン
6. MVC パターン
7. データ層とビジネスロジック層の分離
8. PostgreSQL とトランザクション
9. Docker でのデータベース管理
10. EJS テンプレートエンジン
11. レスポンシブ Web デザイン
12. クライアント側バリデーション
13. セキュリティミドルウェア (Helmet, Rate Limit, CSRF)
14. 本番環境へのデプロイ

## トラブルシューティング

### PostgreSQL が起動しない

```bash
# ポート5432が使われていないか確認
lsof -i :5432

# コンテナを完全に削除して再作成
docker-compose down -v
docker-compose up -d
```

### パスワード認証エラー

```bash
# DATABASE_URL を確認
cat .env | grep DATABASE_URL

# コンテナを再作成
docker-compose down -v
docker-compose up -d
```

### データが表示されない

```bash
# USE_DATABASE の設定を確認
cat .env | grep USE_DATABASE

# サーバーログを確認
# [RepositoryFactory] Using PostgresUserRepository
# が表示されているか確認
```

### CSS が反映されない

```bash
# ブラウザのキャッシュをクリア
# Chrome: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

# サーバーを再起動
# Ctrl+C で停止後、npm run dev
```

### OAuth コールバックエラー

**症状**: OAuth ログイン後に「Invalid state」エラー

**原因**: コールバック URL の不一致

**解決策**:

1. GitHub/Google の設定で正確なコールバック URL を確認
2. 環境変数 `GITHUB_REDIRECT_URI` / `GOOGLE_REDIRECT_URI` を確認
3. URL の末尾のスラッシュに注意（`/callback` vs `/callback/`）

### CSRF トークンエラー

**症状**: フォーム送信時に 403 Forbidden

**原因**: CSRF トークンが無効または期限切れ

**解決策**:

1. ページをリロードして新しいトークンを取得
2. Cookie が有効になっているか確認
3. 本番環境で `CSRF_SECRET` が設定されているか確認
