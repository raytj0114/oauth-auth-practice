# OAuth Authentication Practice

OAuth 2.0 とメール/パスワード認証の実装練習プロジェクト

## 機能

- ✅ メール/パスワード認証
- ✅ GitHub OAuth
- ✅ Google OAuth
- ✅ セッション管理
- ✅ ユーザープロフィール
- ✅ 設定管理

## ドキュメント

- **OAuth を学ぶ**: [OAuth 2.0 完全ガイド](./docs/OAUTH_GUIDE.md) - 基礎から実装まで
- **システム設計**: [Architecture](./ARCHITECTURE.md) - 技術的な設計

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

`.env` を編集して、OAuth 認証情報を設定:

```env
PORT=3000
NODE_ENV=development

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

SESSION_MAX_AGE=86400000
```

### 3. OAuth App の作成

#### GitHub

1. https://github.com/settings/developers
2. "New OAuth App"
3. Callback URL: `http://localhost:3000/auth/github/callback`

#### Google

1. https://console.cloud.google.com/
2. OAuth 2.0 クライアント ID を作成
3. リダイレクト URI: `http://localhost:3000/auth/google/callback`

### 4. サーバー起動

```bash
npm run dev
```

http://localhost:3000 にアクセス

## プロジェクト構造

```
src/
├── auth/
│   ├── stores/
│   │   ├── UserRepository.js     # ユーザー情報管理
│   │   └── AuthRepository.js     # 認証情報管理
│   ├── providers/
│   │   ├── GitHubProvider.js     # GitHub OAuth
│   │   └── GoogleProvider.js     # Google OAuth
│   ├── UnifiedAuthService.js     # 認証ビジネスロジック
│   ├── AuthManager.js            # OAuth フロー管理
│   └── SessionManager.js         # セッション管理
├── middleware/
│   └── auth.js                   # 認証ミドルウェア
└── routes/
    ├── auth.js                   # OAuth ルート
    ├── local-auth.js             # メール/パスワード ルート
    └── protected.js              # 保護されたルート
```

## アーキテクチャ

このプロジェクトは**Repository パターン**を採用しています。

### データ層の分離

```
┌─────────────────────┐
│  UserRepository     │  ← ユーザー情報(プロフィール、設定)
└─────────────────────┘
         ↕ userId
┌─────────────────────┐
│  AuthRepository     │  ← 認証情報(パスワード、OAuth連携)
└─────────────────────┘
```

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

# デバッグモード
npm run debug
```

### デバッグエンドポイント(開発環境のみ)

```
GET /debug
```

各ストアの状態をコンソールに出力します。

## セキュリティ

- ✅ パスワードは bcrypt でハッシュ化(saltRounds=10)
- ✅ セッションは HttpOnly Cookie
- ✅ CSRF 対策(State パラメータ)
- ✅ パスワードハッシュは外部に公開しない
- ✅ OAuth アクセストークンは使い捨て(保存しない)

## 学習ポイント

このプロジェクトで学べること:

1. OAuth 2.0 認可コードフロー
2. パスワード認証とハッシュ化
3. セッション管理
4. Repository パターン
5. データ層とビジネスロジック層の分離
