# アーキテクチャドキュメント

## 目次

1. [概要](#概要)
2. [システム構成](#システム構成)
3. [データモデル](#データモデル)
4. [認証フロー](#認証フロー)
5. [認証パターン](#認証パターン)
6. [セキュリティ](#セキュリティ)

## 概要

このプロジェクトは、OAuth 2.0 とメール/パスワード認証を統合した認証システムの実装例です。

### 設計原則

- **関心の分離**: データ層とビジネスロジック層を分離
- **Repository パターン**: データアクセスを抽象化
- **セキュリティファースト**: パスワードハッシュ化、CSRF 対策など

## システム構成

### レイヤー構造

```
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
│  Data Access Layer (Repositories)       │
│  - UserRepository                       │
│  - AuthRepository                       │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  Storage Layer (In-Memory)              │
│  - Map (users)                          │
│  - Map (authentications)                │
│  - Map (sessions)                       │
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

#### UnifiedAuthService

**責務**: ビジネスロジックの調整

**メソッド**:

- `registerLocal()`: メール/パスワード登録
- `loginLocal()`: メール/パスワードログイン
- `loginOrRegisterOAuth()`: OAuth ログイン/登録
- `getUserWithAuths()`: ユーザー情報+認証方法取得
- `updatePreferences()`: 設定更新
- `updateProfile()`: プロフィール更新

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
│ preferences (JSON)  │
│ profile (JSON)      │
└─────────────────────┘
         ↑
         │ 1:N
         │
┌─────────────────────┐
│  Authentications    │
│─────────────────────│
│ id (PK)             │
│ userId (FK)         │←─┐
│ provider            │   │
│ providerId          │   │
│ email               │   │
│ passwordHash        │   │
│ createdAt           │   │
└─────────────────────┘   │
                          │
        ┌─────────────────┘
        │
        │ 同じユーザーが複数の認証方法を持てる
        │ (将来の拡張用。現在は1ユーザー1認証)
```

### データの関係性

**パターン 1 (現在の実装): 別アカウント**

```
users: Map {
  'user_001' => { email: 'user@example.com', ... },
  'user_002' => { email: 'user@example.com', ... }  // 別ユーザー
}

authentications: Map {
  'auth_001' => { userId: 'user_001', provider: 'local', ... },
  'auth_002' => { userId: 'user_002', provider: 'github', ... }
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
3. UserRepository.create()
   → users Map に追加
   ↓
4. AuthRepository.createLocal()
   → パスワードハッシュ化
   → authentications Map に追加
   ↓
5. SessionManager.create()
   → sessions Map に追加
   ↓
6. Cookie にセッションIDをセット
   ↓
7. /profile にリダイレクト
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
9. UserRepository.create()
   → 新規ユーザー作成
   ↓
10. AuthRepository.createOAuth()
    → OAuth認証情報を作成
    ↓
11. SessionManager.create()
    ↓
12. Cookie にセッションIDをセット
    ↓
13. /profile にリダイレクト
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
7. HTML レスポンス
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
- **有効期限**: 24 時間 (設定可能)
- **セッション ID**: 暗号学的に安全なランダム値

```javascript
res.cookie("sessionId", sessionId, {
  httpOnly: true, // XSS 対策
  secure: true, // 本番環境では HTTPS のみ
  maxAge: 86400000, // 24時間
});
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

## データベース移行の考慮事項

現在はメモリ(Map)を使用していますが、以下のようにデータベースに移行可能:

### PostgreSQL スキーマ例

```sql
-- Users テーブル
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP NOT NULL,
  last_login_at TIMESTAMP NOT NULL,
  preferences JSONB,
  profile JSONB
);

-- Authentications テーブル
CREATE TABLE authentications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  provider VARCHAR(50) NOT NULL,
  provider_id VARCHAR(255),
  email VARCHAR(255),
  password_hash VARCHAR(255),
  created_at TIMESTAMP NOT NULL,

  UNIQUE(provider, provider_id),
  INDEX(user_id),
  INDEX(provider, provider_id)
);

-- Sessions テーブル
CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,

  INDEX(user_id),
  INDEX(expires_at)
);
```

### 移行手順

1. Repository インターフェースを作成
2. PostgreSQL 実装を作成
3. 依存性注入で切り替え
4. Map 実装と PostgreSQL 実装を並行稼働
5. データ移行
6. Map 実装を削除

Repository パターンを採用しているため、移行は比較的容易です。

## パフォーマンス考慮事項

### 現在の実装 (メモリ)

**長所**:

- ✅ 非常に高速
- ✅ セットアップ不要

**短所**:

- ❌ サーバー再起動でデータ消失
- ❌ スケールしない
- ❌ メモリ使用量が増加

### 本番環境への移行

**セッション**:

- Redis への移行を推奨
- TTL で自動削除

**ユーザー/認証データ**:

- PostgreSQL または MySQL
- トランザクション対応

## 拡張ポイント

将来追加可能な機能:

1. **メール認証**

   - 登録時にメール送信
   - メールアドレスの所有確認

2. **アカウント連携**

   - 手動でのアカウント連携機能
   - 連携一覧・解除機能

3. **パスワードリセット**

   - メール経由でのリセット
   - リセットトークン管理

4. **Two-Factor Authentication (2FA)**

   - TOTP (Google Authenticator 等)
   - バックアップコード

5. **ソーシャルログイン追加**

   - Twitter/X
   - Discord
   - Microsoft

6. **監査ログ**
   - ログイン履歴
   - 設定変更履歴
   - IP アドレス記録

## まとめ

このアーキテクチャは:

- ✅ セキュアな実装
- ✅ 拡張しやすい設計
- ✅ データベース移行が容易
- ✅ 学習に最適な構造

Repository パターンと レイヤー分離により、保守性の高いコードベースを実現しています。
