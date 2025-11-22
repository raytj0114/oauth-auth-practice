# アーキテクチャドキュメント

## 目次

1. [概要](#概要)
2. [システム構成](#システム構成)
3. [データモデル](#データモデル)
4. [認証フロー](#認証フロー)
5. [認証パターン](#認証パターン)
6. [セキュリティ](#セキュリティ)
7. [データベース実装](#データベース実装)
8. [プレゼンテーション層の実装](#プレゼンテーション層の実装)
9. [パフォーマンス考慮事項](#パフォーマンス考慮事項)
10. [拡張ポイント](#拡張ポイント)

## 概要

このプロジェクトは、OAuth 2.0 とメール/パスワード認証を統合した認証システムの実装例です。

### 設計原則

- **関心の分離**: データ層とビジネスロジック層を分離
- **Repository パターン**: データアクセスを抽象化
- **Factory パターン**: ストレージの切り替えを容易に
- **MVC パターン**: プレゼンテーション層の明確な分離
- **セキュリティファースト**: パスワードハッシュ化、CSRF 対策など

## システム構成

### レイヤー構造

```
┌─────────────────────────────────────────┐
│  Presentation Layer (Views)             │
│  - EJS Templates                        │
│  - Layouts & Partials                   │
│  - Static Assets (CSS, JS)              │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Presentation Layer (Routes)            │
│  - auth.js (OAuth)                      │
│  - local-auth.js (Email/Password)       │
│  - protected.js (Protected Routes)      │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Business Logic Layer                   │
│  - UnifiedAuthService                   │
│  - AuthManager                          │
│  - SessionManager                       │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Factory Layer                          │
│  - RepositoryFactory                    │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Data Access Layer (Repositories)       │
│  - PostgresUserRepository               │
│  - PostgresAuthRepository               │
│  - PostgresSessionRepository            │
│  - MemoryUserRepository (for testing)   │
│  - MemoryAuthRepository (for testing)   │
│  - MemorySessionRepository (for testing)│
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Storage Layer                          │
│  - PostgreSQL (production)              │
│  - Memory/Map (development/testing)     │
└─────────────────────────────────────────┘
```

### コンポーネント詳細

#### UserRepository

**責務**: ユーザー情報の管理

**データ**:

```javascript
{
  id: 'user_abc123',
  username: 'john_doe',
  email: 'user@example.com',
  createdAt: 1234567890,
  lastLoginAt: 1234567890,

  // アプリ固有のデータ
  preferences: {
    theme: 'dark',
    language: 'ja'
  },
  profile: {
    bio: '',
    avatarUrl: 'https://...'
  }
}
```

**メソッド**:

- `create()`: ユーザー作成
- `findById()`: ユーザー取得
- `updatePreferences()`: 設定更新
- `updateProfile()`: プロフィール更新
- `updateLastLogin()`: 最終ログイン日時更新

#### AuthRepository

**責務**: 認証情報の管理

**データ**:

```javascript
{
  id: 'auth_xyz789',
  userId: 'user_abc123',  // UserRepository への参照
  provider: 'local',       // 'local', 'github', 'google'
  providerId: null,        // OAuth の場合はプロバイダーのユーザーID
  email: 'user@example.com',
  passwordHash: '$2b$10$...', // local の場合のみ
  createdAt: 1234567890
}
```

**メソッド**:

- `createLocal()`: ローカル認証作成
- `createOAuth()`: OAuth 認証作成
- `verifyLocalPassword()`: パスワード検証
- `findUserByOAuth()`: OAuth でユーザー ID 取得
- `findAuthsByUserId()`: ユーザーの認証方法取得

#### SessionRepository

**責務**: セッション情報の管理

**データ**:
```javascript
{
  id: 'session_abc123',
  userId: 'user_abc123',
  userData: { ... },      // ユーザー情報のスナップショット
  createdAt: 1234567890,
  expiresAt: 1234567890,
  lastAccessedAt: 1234567890
}
```

**メソッド**:
- `create()`: セッション作成
- `get()`: セッション取得
- `updateUserData()`: セッションデータ更新
- `destroy()`: セッション削除
- `destroyAllForUser()`: ユーザーの全セッション削除
- `cleanupExpired()`: 期限切れセッション削除
- `getActiveSessionsForUser()`: アクティブセッション一覧

#### RepositoryFactory

**責務**: ストレージの切り替え

**動作**:

```javascript
// 環境変数で切り替え
USE_DATABASE=true  → PostgreSQL版を返す
USE_DATABASE=false → メモリ版を返す
```

**メソッド**:

- `getUserRepository()`: UserRepository を取得
- `getAuthRepository()`: AuthRepository を取得
- `getSessionRepository()`: SessionRepository を取得
- `getStorageType()`: 現在のストレージタイプを返す

**実装パターン**:

- Dynamic Import: 必要な時だけモジュールを読み込む
- Singleton: アプリ全体で 1 つのインスタンス
- Lazy Initialization: 初回アクセス時に初期化

#### UnifiedAuthService

**責務**: ビジネスロジックの調整

**メソッド**:

- `registerLocal()`: メール/パスワード登録
- `loginLocal()`: メール/パスワードログイン
- `loginOrRegisterOAuth()`: OAuth ログイン/登録
- `getUserWithAuths()`: ユーザー情報+認証方法取得
- `updatePreferences()`: 設定更新
- `updateProfile()`: プロフィール更新

**トランザクション対応**:

- PostgreSQL 使用時は自動的にトランザクション実行
- メモリ使用時はトランザクション不要

#### OAuth Providers

**責務**: OAuth プロバイダー固有の処理

**共通メソッド**:

- `getAuthorizationUrl(state)`: 認可 URL 生成
- `exchangeCodeForToken(code)`: トークン交換
- `getUserInfo(accessToken)`: ユーザー情報取得

**実装**:

- `GitHubProvider`: GitHub OAuth
- `GoogleProvider`: Google OAuth

## データモデル

### ER 図

```
┌─────────────────────┐
│     Users           │
│─────────────────────│
│ id (PK)             │
│ username            │
│ email               │
│ createdAt           │
│ lastLoginAt         │
│ preferences (JSONB) │
│ profile (JSONB)     │
└─────────────────────┘
         ↑
         │ 1:N
         │
┌─────────────────────┐
│  Authentications    │
│─────────────────────│
│ id (PK)             │
│ userId (FK)         │←──┐
│ provider            │   │
│ providerId          │   │
│ email               │   │
│ passwordHash        │   │
│ createdAt           │   │
└─────────────────────┘   │
         ↑                │
         │ 1:N            │
         │                │
┌─────────────────────┐   │
│     Sessions        │   │
│─────────────────────│   │
│ id (PK)             │   │
│ userId (FK)         │───┘
│ data (JSONB)        │
│ expiresAt           │
│ lastAccessedAt      │
│ createdAt           │
└─────────────────────┘
```

### データの関係性

**パターン 1 (現在の実装): 別アカウント**

```
users: Map/Table {
  'user_001' => { email: 'user@example.com', ... },
  'user_002' => { email: 'user@example.com', ... }  // 別ユーザー
}

authentications: Map/Table {
  'auth_001' => { userId: 'user_001', provider: 'local', ... },
  'auth_002' => { userId: 'user_002', provider: 'github', ... }
}

sessions: Map/Table {
  'session_001' => { userId: 'user_001', ... },
  'session_002' => { userId: 'user_002', ... }
}
```

同じメールアドレスでも別アカウントとして扱われます。

## 認証フロー

### メール/パスワード登録

```
1. ユーザー: POST /local/signup
   { username, email, password }
   ↓
2. UnifiedAuthService.registerLocal()
   ↓
3. トランザクション開始 (PostgreSQLの場合)
   ↓
4. UserRepository.create()
   → users テーブル/Map に追加
   ↓
5. AuthRepository.createLocal()
   → パスワードハッシュ化
   → authentications テーブル/Map に追加
   ↓
6. トランザクションコミット
   ↓
7. SessionManager.create()
   → sessions テーブル/Map に追加
   ↓
8. Cookie にセッションIDをセット
   ↓
9. /profile にリダイレクト
```

### OAuth ログイン (初回)

```
1. ユーザー: GET /auth/github
   ↓
2. AuthManager.startAuthentication('github')
   → State生成 (CSRF対策)
   → GitHubProvider.getAuthorizationUrl()
   ↓
3. GitHub へリダイレクト
   ↓
4. ユーザーが GitHub で認可
   ↓
5. GitHub が /auth/github/callback へリダイレクト
   ↓
6. AuthManager.handleCallback()
   → State検証
   → GitHubProvider.exchangeCodeForToken()
   → GitHubProvider.getUserInfo()
   ↓
7. UnifiedAuthService.loginOrRegisterOAuth()
   ↓
8. AuthRepository.findUserByOAuth()
   → 見つからない (初回)
   ↓
9. トランザクション開始 (PostgreSQLの場合)
   ↓
10. UserRepository.create()
    → 新規ユーザー作成
    ↓
11. AuthRepository.createOAuth()
    → OAuth認証情報を作成
    ↓
12. トランザクションコミット
    ↓
13. SessionManager.create()
    ↓
14. Cookie にセッションIDをセット
    ↓
15. /profile にリダイレクト
```

### OAuth ログイン (2 回目以降)

```
1-7. (上記と同じ)
   ↓
8. AuthRepository.findUserByOAuth()
   → 既存ユーザー発見!
   ↓
9. UserRepository.findById()
   → ユーザー情報取得
   ↓
10. UserRepository.updateLastLogin()
    ↓
11. SessionManager.create()
    ↓
12. (以降同じ)
```

### 保護されたルートへのアクセス

```
1. ユーザー: GET /profile
   Cookie: sessionId=xyz789
   ↓
2. requireAuth ミドルウェア
   ↓
3. SessionManager.get(sessionId)
   → セッション取得
   → 有効期限チェック
   ↓
4. req.user にユーザー情報をセット
   ↓
5. ルートハンドラー実行
   ↓
6. UnifiedAuthService.getUserWithAuths()
   → 最新のユーザー情報を取得
   ↓
7. EJS テンプレートをレンダリング
   ↓
8. HTML レスポンス
```

## 認証パターン

### パターン 1: 別アカウント (現在の実装)

**挙動**:

```
user@example.com でローカル登録 → アカウントA
user@example.com で GitHub      → アカウントB (別)
user@example.com で Google      → アカウントC (別)
```

**メリット**:

- ✅ セキュリティリスクなし
- ✅ メールアドレス乗っ取り攻撃を防止
- ✅ 実装がシンプル
- ✅ 主要サービスと同じパターン

**デメリット**:

- ❌ ユーザーが複数アカウントを持つ可能性
- ❌ データが分散する

**採用理由**:

1. セキュリティが最優先
2. Claude、Slack、Discord 等の主要サービスと同じ
3. 学習目的で安全な実装を優先

### パターン 2: 自動連携 (不採用)

**挙動**:

```
user@example.com でローカル登録 → アカウントA
user@example.com で GitHub      → アカウントAに自動連携
```

**セキュリティリスク**:

```
攻撃シナリオ:
1. 攻撃者が victim@example.com でアカウント作成
2. 被害者が GitHub でログイン
3. 攻撃者のアカウントに自動連携
4. 攻撃者がパスワードでログイン
5. 被害者のデータにアクセス可能!
```

**不採用理由**: セキュリティリスクが高い

### パターン 3: ユーザーに確認 (将来の拡張)

**挙動**:

```
user@example.com でローカル登録 → アカウントA
user@example.com で GitHub      → 確認画面表示
                                → ユーザーが選択
```

将来の機能として検討中。

## セキュリティ

### パスワードハッシュ化

```javascript
// bcrypt を使用
const passwordHash = await bcrypt.hash(password, 10);
// saltRounds=10: ハッシュ計算の強度

// 検証
const isValid = await bcrypt.compare(password, passwordHash);
```

**重要**: パスワードハッシュは以下に含めない

- セッションデータ
- API レスポンス
- ログ出力

### CSRF 対策

OAuth フローで State パラメータを使用:

```javascript
// 認証開始時
const state = crypto.randomBytes(16).toString("hex");
pendingStates.set(state, { provider, createdAt });

// コールバック時
if (!pendingStates.has(state)) {
  throw new Error("Invalid state");
}
```

### セッション管理

- **HttpOnly Cookie**: JavaScript からアクセス不可
- **PostgreSQL 永続化**: サーバー再起動でも維持
- **有効期限**: 24 時間 (設定可能)
- **セッション ID**: 暗号学的に安全なランダム値
- **自動クリーンアップ**: 期限切れセッションを定期削除
```javascript
res.cookie("sessionId", sessionId, {
  httpOnly: true, // XSS 対策
  secure: true, // 本番環境では HTTPS のみ
  maxAge: 86400000, // 24時間
});
```

### SQL インジェクション対策

パラメータ化クエリを使用:

```javascript
// ❌ 危険
await pool.query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ 安全
await pool.query("SELECT * FROM users WHERE email = $1", [email]);
```

### XSS 対策

EJS の自動エスケープを使用:
```html
<!-- ✅ 自動エスケープ (安全) -->
<p><%= user.username %></p>

<!-- ❌ エスケープなし (危険) -->
<p><%- user.username %></p>
```

### OAuth アクセストークン

**現在の実装**: 使い捨て

```javascript
const accessToken = await provider.exchangeCodeForToken(code);
const userInfo = await provider.getUserInfo(accessToken);
// ↑ この後、accessToken は破棄される (保存しない)
```

**理由**:

- ユーザー情報取得後は不要
- 保存するとセキュリティリスク
- GitHub API を継続的に使う予定がない

将来 GitHub API を使う場合は、暗号化して保存する必要があります。

## データベース実装

### PostgreSQL スキーマ

```sql
-- Users テーブル
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP NOT NULL DEFAULT NOW(),
  preferences JSONB DEFAULT '{}',
  profile JSONB DEFAULT '{}'
);

-- Authentications テーブル
CREATE TABLE authentications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_id VARCHAR(255),
  email VARCHAR(255),
  password_hash VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(provider, provider_id)
);

-- Sessions テーブル
CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_auth_user_id ON authentications(user_id);
CREATE INDEX idx_auth_provider ON authentications(provider, provider_id);
CREATE INDEX idx_auth_email ON authentications(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### コネクションプール

```javascript
// 設定
{
  max: 20,                    // 最大接続数
  idleTimeoutMillis: 30000,   // アイドルタイムアウト
  connectionTimeoutMillis: 2000 // 接続タイムアウト
}
```

**メリット**:

- 接続の再利用で高速化
- リソースの効率的な管理
- 複数リクエストの同時処理

### トランザクション

ユーザー登録時にトランザクションを使用:

```javascript
await DatabaseConnection.transaction(async (client) => {
  // 1. ユーザー作成
  await createUser();

  // 2. 認証情報作成
  await createAuth();

  // 両方成功 → COMMIT
  // どちらか失敗 → ROLLBACK
});
```

**保証される整合性**:

- ユーザーだけ作成されて認証情報がない状態を防ぐ
- 認証情報だけ作成される状態を防ぐ
- オールオアナッシング

**実装の工夫**:

```javascript
// PostgreSQL使用時のみトランザクション
if (USE_DATABASE === "true") {
  await registerWithTransaction();
} else {
  // メモリはトランザクション不要
  await registerDirect();
}
```

### パラメータ化クエリ

SQL インジェクション対策:

```javascript
// ❌ 危険
query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ 安全
query("SELECT * FROM users WHERE email = $1", [email]);
```

### JSONB 型の活用

柔軟なデータ構造:

```javascript
// preferences と profile は JSONB
preferences: {
  theme: 'dark',
  language: 'ja',
  notifications: true,
  // 将来的に追加可能
  customSettings: { ... }
}
```

**メリット**:

- スキーマ変更不要で項目追加可能
- JSON 操作が高速
- インデックス作成も可能

**更新方法**:

```javascript
// 方法1: JavaScript側でマージ
const existing = await findById(userId);
const updated = { ...existing.preferences, ...newPreferences };
await query("UPDATE users SET preferences = $1", [JSON.stringify(updated)]);

// 方法2: PostgreSQLのJSONB演算子
await query("UPDATE users SET preferences = preferences || $1::jsonb", [
  JSON.stringify(newPreferences),
]);
```

### メモリ版との比較

| 項目                 | メモリ版             | PostgreSQL 版    |
| -------------------- | -------------------- | ---------------- |
| **速度**             | 非常に高速           | 高速             |
| **永続性**           | なし                 | あり             |
| **スケール**         | 単一サーバーのみ     | 複数サーバー可能 |
| **トランザクション** | 不要                 | 対応             |
| **本番環境**         | 不可                 | 可能             |
| **用途**             | 開発・テスト         | 本番運用         |
| **セットアップ**     | 不要                 | Docker 必要      |
| **データ永続化**     | サーバー再起動で消失 | 永続化           |

### 実装済みの機能

- ✅ PostgreSQL スキーマ設計
- ✅ Repository パターン実装
- ✅ Factory パターンで切り替え
- ✅ トランザクション対応
- ✅ コネクションプール
- ✅ パラメータ化クエリ
- ✅ JSONB 型の活用
- ✅ インデックス最適化
- ✅ 外部キー制約
- ✅ CASCADE 削除
- ✅ セッション永続化

### 本番環境への展開

**推奨構成**:

1. **データベース**: Managed PostgreSQL (AWS RDS, Google Cloud SQL, Supabase 等)
2. **アプリケーション**: Docker コンテナ
3. **環境変数**: シークレット管理サービス使用

**必要な手順**:

1. DATABASE_URL を本番環境のものに変更
2. USE_DATABASE=true に設定
3. init.sql を実行してテーブル作成
4. 接続プールの設定を調整(max, timeout 等)
5. SSL 接続を有効化

**環境変数の例**:

```env
# 本番環境
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/oauth_db?sslmode=require
USE_DATABASE=true
NODE_ENV=production
```

## プレゼンテーション層の実装

### EJS テンプレートエンジン

**責務**: ビューのレンダリング

**構造**:
```
views/
├── layouts/
│   └── main.ejs           # 共通レイアウト
├── partials/
│   ├── header.ejs         # ヘッダー(ナビゲーション)
│   └── footer.ejs         # フッター
├── auth/
│   ├── signin.ejs         # サインインページ
│   └── signup.ejs         # サインアップページ
├── home.ejs               # ホームページ
├── profile.ejs            # プロフィールページ
└── error.ejs              # エラーページ
```

**特徴**:
- **パーシャル**: 再利用可能なコンポーネント
- **レイアウト**: 共通構造を共有
- **自動エスケープ**: XSS 対策
- **JavaScript 構文**: そのまま使える

**ビューヘルパー**:
```javascript
// src/middleware/viewHelpers.js
res.locals.user           // 現在のユーザー
res.locals.formatDate()   // 日付フォーマット
res.locals.formatDateTime() // 日時フォーマット
res.locals.currentYear    // 現在の年
res.locals.NODE_ENV       // 環境変数
res.locals.currentPath    // 現在のパス
```

**使用例**:
```html
<!-- パーシャルの読み込み -->
<%- include('partials/header') %>

<!-- 変数の表示 (自動エスケープ) -->
<p><%= user.username %></p>

<!-- 条件分岐 -->
<% if (user) { %>
  <p>Welcome, <%= user.username %>!</p>
<% } else { %>
  <p>Please sign in</p>
<% } %>

<!-- ループ -->
<% linkedProviders.forEach(provider => { %>
  <div><%= provider.provider %></div>
<% }); %>

<!-- ヘルパー関数 -->
<p><%= formatDate(user.createdAt) %></p>
```

### 静的アセット

#### CSS: `public/css/style.css`

**設計原則**:
- CSS Variables でテーマ管理
- レスポンシブデザイン (モバイルファースト)
- コンポーネントベースの設計
- BEM 風の命名規則

**主要コンポーネント**:
```css
/* Variables */
:root {
  --primary-color: #0366d6;
  --danger-color: #dc3545;
  --text-color: #24292e;
  --border-color: #e1e4e8;
  --bg-light: #f6f8fa;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* Components */
.card { ... }
.btn { ... }
.form-group { ... }
.section { ... }
.info-row { ... }
.linked-account { ... }

/* Utilities */
.text-center { ... }
.text-muted { ... }
.mt-1, .mt-2, ... { ... }
```

**レスポンシブブレークポイント**:
```css
@media (max-width: 768px) {
  /* タブレット/モバイル */
}
```

#### JavaScript: `public/js/main.js`

**機能**:
- クライアント側バリデーション
- フォームインタラクション
- アニメーション制御
- ユーザー体験の向上

**主要機能**:
```javascript
// フォームバリデーション
document.querySelector('form').addEventListener('submit', (e) => {
  // バリデーションロジック
});

// テーマ変更ハンドリング
themeSelect.addEventListener('change', () => {
  // プレビュー表示
});

// Logout 確認
logoutForm.addEventListener('submit', (e) => {
  if (!confirm('Are you sure?')) {
    e.preventDefault();
  }
});

// スムーズアニメーション
const observer = new IntersectionObserver((entries) => {
  // アニメーション制御
});
```

### ルーティング

**Routes の責務**:
- リクエストの受付
- 入力バリデーション
- Service 層の呼び出し
- ビューのレンダリング
- リダイレクト処理

**例**:
```javascript
// src/routes/protected.js
router.get('/profile', requireAuth, async (req, res) => {
  // 1. Service層からデータ取得
  const user = await UnifiedAuthService.getUserWithAuths(req.user.id);
  
  // 2. ビューをレンダリング
  res.render('profile', {
    title: `Profile - ${user.username}`,
    user,
    linkedProviders: user.linkedProviders || []
  });
});
```
### MVC パターンの実装
```
┌─────────────────────────────────────┐
│  View (EJS Templates)               │
│  - Presentation Logic               │
│  - User Interface                   │
└─────────────────────────────────────┘
                 ↑
                 │ render()
                 │
┌─────────────────────────────────────┐
│  Controller (Routes)                │
│  - Request Handling                 │
│  - Input Validation                 │
│  - Response Generation              │
└─────────────────────────────────────┘
                 ↑
                 │ call methods
                 │
┌─────────────────────────────────────┐
│  Model (Service + Repository)       │
│  - Business Logic                   │
│  - Data Access                      │
│  - Domain Logic                     │
└─────────────────────────────────────┘
```

**責務の分離**:

| Layer | 責務 | 例 |
|-------|------|-----|
| **View** | UI表示、ユーザー入力 | EJS テンプレート、CSS、JavaScript |
| **Controller** | リクエスト処理、フロー制御 | Express Routes |
| **Model** | ビジネスロジック、データ操作 | Service、Repository |

**データフロー**:
```
User Request
    ↓
Controller (Route)
    ↓
Model (Service)
    ↓
Model (Repository)
    ↓
Database
    ↓
Model (Repository)
    ↓
Model (Service)
    ↓
Controller (Route)
    ↓
View (EJS)
    ↓
User Response
```

## パフォーマンス考慮事項

### 現在の実装 (PostgreSQL)

**長所**:
- ✅ データ永続化
- ✅ 複数サーバーで共有可能
- ✅ トランザクション対応
- ✅ 本番環境で使用可能
- ✅ セッション永続化

**最適化のポイント**:
- インデックスで検索高速化済み
- コネクションプールで接続再利用
- JSONB フィールドで柔軟性確保
- EJS テンプレートキャッシュ (本番環境)

### クエリパフォーマンス

**よく使うクエリ**:
```sql
-- ログイン (高速: idx_auth_email使用)
SELECT user_id FROM authentications 
WHERE email = $1 AND provider = 'local';

-- OAuth検索 (高速: idx_auth_provider使用)
SELECT user_id FROM authentications 
WHERE provider = $1 AND provider_id = $2;

-- ユーザー情報取得 (高速: PRIMARY KEY)
SELECT * FROM users WHERE id = $1;

-- 認証方法一覧 (高速: idx_auth_user_id使用)
SELECT * FROM authentications WHERE user_id = $1;

-- セッション取得 (高速: PRIMARY KEY + idx_sessions_expires_at)
SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW();
```

### セッション管理のパフォーマンス

**現在の実装**: PostgreSQL

**利点**:
- データ永続化
- 複数サーバー間で共有可能
- トランザクション対応
- 定期的な自動クリーンアップ

**最適化**:
- `expires_at` にインデックス作成済み
- 定期クリーンアップで不要データ削除
- コネクションプール活用

**将来の選択肢**:

**オプション 1: Redis (推奨 - 大規模)**
- 高速なインメモリストア
- TTL で自動削除
- 複数サーバー間でセッション共有
- Pub/Sub 機能

**オプション 2: PostgreSQL (現在 - 中小規模)**
- 既存インフラ活用
- 追加サービス不要
- 中小規模アプリには十分

### フロントエンドパフォーマンス

**静的アセット**:
- CSS/JS ファイルは最小化 (本番環境)
- ブラウザキャッシュ活用
- CDN 利用可能 (将来)

**レンダリング**:
- EJS テンプレートキャッシュ (本番環境で自動)
- 必要なデータのみ取得
- 非同期処理でブロッキング回避

**クライアント側**:
- Intersection Observer で遅延アニメーション
- イベントデリゲーション
- 不要な再レンダリング回避

## 拡張ポイント

将来追加可能な機能:

### 1. メール認証

```sql
-- メール確認トークンテーブル
CREATE TABLE email_verification_tokens (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**実装内容**:

- 登録時にメール送信
- トークンで確認
- `users.email_verified` フラグ追加
- メール送信サービス統合 (SendGrid, AWS SES 等)

**テンプレート**:
```html
<!-- views/auth/verify-email.ejs -->
<h1>Verify Your Email</h1>
<p>Check your email for verification link</p>
```

### 2. アカウント連携

**現在**: 同じメールアドレスでも別アカウント

**拡張**: ユーザーが手動で連携

```sql
-- 既存のテーブルで対応可能
-- 同じuser_idに複数のauthenticationsを作成
INSERT INTO authentications (user_id, provider, provider_id)
VALUES ('user_001', 'github', '12345');
```

**UI 追加**:

- プロフィールページに「アカウント連携」ボタン
- GitHub/Google と連携
- 連携解除機能

**テンプレート**:
```html
<!-- views/profile.ejs に追加 -->
<div class="section">
  <h2>Link Accounts</h2>
  <a href="/auth/link/github" class="btn btn-github">Link GitHub</a>
  <a href="/auth/link/google" class="btn btn-google">Link Google</a>
</div>
```

### 3. パスワードリセット

```sql
-- パスワードリセットトークンテーブル
CREATE TABLE password_reset_tokens (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**フロー**:

1. メールアドレス入力
2. トークン生成してメール送信
3. トークンでパスワードリセット画面表示
4. 新しいパスワード設定

**テンプレート**:
```html
<!-- views/auth/forgot-password.ejs -->
<!-- views/auth/reset-password.ejs -->
```

### 4. Two-Factor Authentication (2FA)

```sql
-- 2FA設定テーブル
CREATE TABLE two_factor_auth (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) UNIQUE,
  secret VARCHAR(255) NOT NULL,
  backup_codes JSONB,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**実装内容**:

- TOTP (Google Authenticator 等)
- QR コード生成
- バックアップコード
- SMS 認証 (オプション)

**テンプレート**:
```html
<!-- views/settings/two-factor.ejs -->
<h2>Two-Factor Authentication</h2>
<img src="/qrcode" alt="QR Code">
<input type="text" placeholder="Enter 6-digit code">
```

### 5. ソーシャルログイン追加

既存の構造で簡単に追加可能:

```javascript
// src/auth/providers/TwitterProvider.js
class TwitterProvider {
  getAuthorizationUrl(state) { ... }
  exchangeCodeForToken(code) { ... }
  getUserInfo(accessToken) { ... }
}
```

**追加候補**:

- Twitter/X
- Discord
- Microsoft
- Apple
- LinkedIn

### 6. 監査ログ

```sql
-- ログインログテーブル
CREATE TABLE login_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  provider VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- 設定変更ログテーブル
CREATE TABLE audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);
```

**記録する内容**:

- ログイン成功/失敗
- IP アドレス
- User-Agent
- 設定変更履歴
- アカウント連携/解除

**テンプレート**:
```html
<!-- views/settings/activity.ejs -->
<h2>Recent Activity</h2>
<% loginLogs.forEach(log => { %>
  <div class="activity-item">
    <p><%= log.provider %> login from <%= log.ip_address %></p>
    <small><%= formatDateTime(log.created_at) %></small>
  </div>
<% }); %>
```

### 7. ユーザー管理画面 (管理者用)
```sql
-- ロールテーブル
CREATE TABLE roles (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  permissions JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ユーザーロール関連
CREATE TABLE user_roles (
  user_id VARCHAR(64) REFERENCES users(id),
  role_id VARCHAR(64) REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);
```

**機能**:
- ユーザー一覧
- ユーザー検索
- アカウント停止/有効化
- ロール管理
- 統計ダッシュボード

**テンプレート**:
```html
<!-- views/admin/users.ejs -->
<h1>User Management</h1>
<table>
  <thead>
    <tr>
      <th>Username</th>
      <th>Email</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <% users.forEach(user => { %>
      <tr>
        <td><%= user.username %></td>
        <td><%= user.email %></td>
        <td><%= user.status %></td>
        <td>
          <a href="/admin/users/<%= user.id %>">View</a>
        </td>
      </tr>
    <% }); %>
  </tbody>
</table>
```

### 8. プロフィール編集

現在は Preferences のみ更新可能。拡張:
```html
<!-- views/profile-edit.ejs -->
<form method="POST" action="/profile/update">
  <div class="form-group">
    <label>Username:</label>
    <input type="text" name="username" value="<%= user.username %>">
  </div>
  
  <div class="form-group">
    <label>Bio:</label>
    <textarea name="bio"><%= user.profile.bio %></textarea>
  </div>
  
  <div class="form-group">
    <label>Location:</label>
    <input type="text" name="location" value="<%= user.profile.location %>">
  </div>
  
  <div class="form-group">
    <label>Website:</label>
    <input type="url" name="website" value="<%= user.profile.website %>">
  </div>
  
  <button type="submit" class="btn btn-primary">Update Profile</button>
</form>
```

### 9. テーマシステムの拡張

現在は Light/Dark のみ。拡張:
```javascript
// preferences に追加
preferences: {
  theme: 'dark',           // light, dark, auto, custom
  accentColor: '#0366d6',  // カスタムアクセントカラー
  fontSize: 'medium',      // small, medium, large
  language: 'ja'
}
```

**CSS Variables の動的適用**:
```html
<style>
  :root {
    --primary-color: <%= user.preferences.accentColor || '#0366d6' %>;
  }
</style>
```

### 10. API エンドポイント

REST API 追加:
```javascript
// src/routes/api.js
router.get('/api/users/:id', requireAuth, async (req, res) => {
  const user = await UnifiedAuthService.getUserWithAuths(req.params.id);
  res.json(user);
});

router.put('/api/users/:id/preferences', requireAuth, async (req, res) => {
  const updated = await UnifiedAuthService.updatePreferences(
    req.params.id,
    req.body
  );
  res.json(updated);
});
```

**認証**: JWT トークン or API キー

## まとめ

このアーキテクチャは:

- ✅ セキュアな実装
- ✅ 拡張しやすい設計
- ✅ データベース移行が完了
- ✅ 本番環境で使用可能
- ✅ 学習に最適な構造
- ✅ テスト容易性の高い設計
- ✅ MVC パターンで保守性向上
- ✅ レスポンシブデザイン対応

### 実装済みの主要機能

**認証・認可**:
- メール/パスワード認証
- GitHub OAuth
- Google OAuth
- セッション管理 (PostgreSQL)
- CSRF 対策
- XSS 対策

**データ管理**:
- Repository パターン
- Factory パターン
- トランザクション対応
- PostgreSQL 永続化
- メモリ版 (テスト用)

**UI/UX**:
- EJS テンプレートエンジン
- レスポンシブデザイン
- クライアント側バリデーション
- スムーズアニメーション
- アクセシビリティ対応

**開発体験**:
- Hot Reload (--watch)
- デバッグエンドポイント
- 明確な責務分離
- 拡張しやすい構造

Repository パターン、Factory パターン、MVC パターンにより、保守性とテスト容易性の高いコードベースを実現しています。メモリと PostgreSQL を環境変数で簡単に切り替えられるため、開発からテスト、本番環境まで同じコードで対応できます。

EJS テンプレートエンジンの導入により、ビューとロジックの分離が明確になり、チーム開発やデザイン変更が容易になりました。