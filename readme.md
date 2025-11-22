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

## セキュリティ

- ✅ パスワードは bcrypt でハッシュ化(saltRounds=10)
- ✅ セッションは HttpOnly Cookie
- ✅ セッションは PostgreSQL に永続化
- ✅ CSRF 対策(State パラメータ)
- ✅ パラメータ化クエリ(SQL インジェクション対策)
- ✅ トランザクションでデータ整合性を保証
- ✅ パスワードハッシュは外部に公開しない
- ✅ OAuth アクセストークンは使い捨て(保存しない)
- ✅ XSS 対策(EJS の自動エスケープ)

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