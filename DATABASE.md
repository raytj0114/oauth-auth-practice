# データベース設計ドキュメント

## 概要

このプロジェクトでは PostgreSQL を使用してユーザー情報と認証情報を管理しています。

## 目次

1. [テーブル設計](#テーブル設計)
2. [リレーションシップ](#リレーションシップ)
3. [データ例](#データ例)
4. [インデックス戦略](#インデックス戦略)
5. [クエリ例](#クエリ例)
6. [データベース管理](#データベース管理)
7. [バックアップとリストア](#バックアップとリストア)
8. [パフォーマンスチューニング](#パフォーマンスチューニング)

## テーブル設計

### users テーブル

ユーザーの基本情報を保存します。

```sql
CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,           -- ユーザーID (user_xxxxx...)
  username VARCHAR(255) NOT NULL,        -- ユーザー名
  email VARCHAR(255),                    -- メールアドレス(NULL可)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),     -- 作成日時
  last_login_at TIMESTAMP NOT NULL DEFAULT NOW(),  -- 最終ログイン日時
  preferences JSONB DEFAULT '{}',        -- 設定(JSON)
  profile JSONB DEFAULT '{}'             -- プロフィール(JSON)
);
```

**フィールド説明:**

| フィールド    | 型           | NULL | 説明                   | 例                    |
| ------------- | ------------ | ---- | ---------------------- | --------------------- |
| id            | VARCHAR(64)  | NO   | 一意なユーザー ID      | `user_abc123...`      |
| username      | VARCHAR(255) | NO   | 表示名                 | `john_doe`            |
| email         | VARCHAR(255) | YES  | メールアドレス         | `user@example.com`    |
| created_at    | TIMESTAMP    | NO   | アカウント作成日時     | `2024-11-09 12:34:56` |
| last_login_at | TIMESTAMP    | NO   | 最後にログインした日時 | `2024-11-10 10:20:30` |
| preferences   | JSONB        | NO   | ユーザー設定           | `{"theme":"dark"}`    |
| profile       | JSONB        | NO   | プロフィール情報       | `{"bio":"Hello"}`     |

**JSONB フィールドの構造:**

```javascript
// preferences の例
{
  "theme": "dark",           // テーマ: light / dark
  "language": "ja",          // 言語: ja / en
  "notifications": true      // 通知: true / false
}

// profile の例
{
  "bio": "Hello, I'm John",  // 自己紹介
  "avatarUrl": "https://...", // アバター画像URL
  "location": "Tokyo",       // 場所
  "website": "https://..."   // ウェブサイト
}
```

**設計のポイント:**

- `email` は NULL 可能(OAuth でメールアドレスを取得できない場合がある)
- `preferences` と `profile` は JSONB で柔軟性を確保
- `created_at` と `last_login_at` は自動で NOW()設定

### authentications テーブル

認証情報を保存します。

```sql
CREATE TABLE authentications (
  id VARCHAR(64) PRIMARY KEY,            -- 認証ID (auth_xxxxx...)
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,         -- プロバイダー: local, github, google
  provider_id VARCHAR(255),              -- OAuthプロバイダーのユーザーID
  email VARCHAR(255),                    -- 認証に使用したメールアドレス
  password_hash VARCHAR(255),            -- パスワードハッシュ(localのみ)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),  -- 作成日時

  UNIQUE(provider, provider_id)          -- 同じOAuthアカウントは1つだけ
);

-- インデックス
CREATE INDEX idx_auth_user_id ON authentications(user_id);
CREATE INDEX idx_auth_provider ON authentications(provider, provider_id);
CREATE INDEX idx_auth_email ON authentications(email);
```

**フィールド説明:**

| フィールド    | 型           | NULL | 説明                       | 例                          |
| ------------- | ------------ | ---- | -------------------------- | --------------------------- |
| id            | VARCHAR(64)  | NO   | 一意な認証 ID              | `auth_xyz789...`            |
| user_id       | VARCHAR(64)  | NO   | users テーブルへの外部キー | `user_abc123...`            |
| provider      | VARCHAR(50)  | NO   | 認証プロバイダー           | `local`, `github`, `google` |
| provider_id   | VARCHAR(255) | YES  | OAuth ID                   | `12345678` (GitHub ID)      |
| email         | VARCHAR(255) | YES  | 認証に使用したメール       | `user@example.com`          |
| password_hash | VARCHAR(255) | YES  | bcrypt ハッシュ            | `$2b$10$...`                |
| created_at    | TIMESTAMP    | NO   | 認証情報作成日時           | `2024-11-09 12:34:56`       |

**プロバイダー別のフィールド:**

| provider | provider_id | email | password_hash |
| -------- | ----------- | ----- | ------------- |
| `local`  | NULL        | 必須  | 必須          |
| `github` | GitHub ID   | 任意  | NULL          |
| `google` | Google ID   | 任意  | NULL          |

**設計のポイント:**

- `UNIQUE(provider, provider_id)` で同じ OAuth アカウントの重複登録を防止
- `ON DELETE CASCADE` でユーザー削除時に認証情報も自動削除
- `password_hash` はローカル認証の場合のみ使用

## リレーションシップ

### ER 図

```
┌─────────────────────┐
│     Users           │
│─────────────────────│
│ id (PK)             │
│ username            │
│ email               │
│ created_at          │
│ last_login_at       │
│ preferences (JSONB) │
│ profile (JSONB)     │
└─────────────────────┘
         ↑
         │ 1:N
         │ ON DELETE CASCADE
         │
┌─────────────────────┐
│  Authentications    │
│─────────────────────│
│ id (PK)             │
│ user_id (FK)        │
│ provider            │
│ provider_id         │
│ email               │
│ password_hash       │
│ created_at          │
│ UNIQUE(provider,    │
│        provider_id) │
└─────────────────────┘
```

**制約:**

- **外部キー制約**: `user_id REFERENCES users(id)`
- **CASCADE 削除**: ユーザーが削除されると、関連する認証情報も自動削除
- **UNIQUE 制約**: `(provider, provider_id)` の組み合わせは一意

**関係性の説明:**

- 1 人のユーザーは複数の認証方法を持てる(将来の拡張用)
- 現在の実装では 1 ユーザー 1 認証(同じメールアドレスでも別アカウント)

## データ例

### 例 1: ローカル認証のみのユーザー

```sql
-- users テーブル
INSERT INTO users (id, username, email, preferences, profile, created_at, last_login_at)
VALUES (
  'user_001',
  'alice',
  'alice@example.com',
  '{"theme":"light","language":"ja","notifications":true}',
  '{"bio":"","avatarUrl":null,"location":"","website":""}',
  '2024-11-09 12:00:00',
  '2024-11-09 12:00:00'
);

-- authentications テーブル
INSERT INTO authentications (id, user_id, provider, provider_id, email, password_hash, created_at)
VALUES (
  'auth_001',
  'user_001',
  'local',
  NULL,
  'alice@example.com',
  '$2b$10$abcdefghijklmnopqrstuvwxyz...',
  '2024-11-09 12:00:00'
);
```

**確認クエリ:**

```sql
SELECT
  u.username,
  u.email,
  a.provider,
  a.created_at as auth_created
FROM users u
JOIN authentications a ON u.id = a.user_id
WHERE u.id = 'user_001';

-- 結果:
-- username | email              | provider | auth_created
-- alice    | alice@example.com  | local    | 2024-11-09 12:00:00
```

### 例 2: GitHub OAuth のみのユーザー

```sql
-- users テーブル
INSERT INTO users (id, username, email, preferences, profile, created_at, last_login_at)
VALUES (
  'user_002',
  'bob_github',
  'bob@example.com',
  '{"theme":"dark","language":"en","notifications":true}',
  '{"bio":"Developer","avatarUrl":"https://avatars.githubusercontent.com/u/12345","location":"San Francisco","website":"https://bob.dev"}',
  '2024-11-09 13:00:00',
  '2024-11-09 13:00:00'
);

-- authentications テーブル
INSERT INTO authentications (id, user_id, provider, provider_id, email, password_hash, created_at)
VALUES (
  'auth_002',
  'user_002',
  'github',
  '12345678',
  'bob@example.com',
  NULL,
  '2024-11-09 13:00:00'
);
```

### 例 3: 同じメールアドレスで別アカウント(パターン 1)

```sql
-- User A: ローカル認証
INSERT INTO users (id, username, email, created_at, last_login_at)
VALUES ('user_001', 'user_local', 'user@example.com', NOW(), NOW());

INSERT INTO authentications (id, user_id, provider, email, password_hash, created_at)
VALUES ('auth_001', 'user_001', 'local', 'user@example.com', '$2b$10$...', NOW());

-- User B: Google OAuth (別アカウント)
INSERT INTO users (id, username, email, created_at, last_login_at)
VALUES ('user_002', 'user_google', 'user@example.com', NOW(), NOW());

INSERT INTO authentications (id, user_id, provider, provider_id, email, created_at)
VALUES ('auth_002', 'user_002', 'google', 'google_id_12345', 'user@example.com', NOW());
```

**確認:**

```sql
SELECT
  u.id,
  u.username,
  u.email,
  a.provider
FROM users u
JOIN authentications a ON u.id = a.user_id
WHERE u.email = 'user@example.com';

-- 結果: 同じメールアドレスで2つのアカウント
-- id       | username     | email              | provider
-- user_001 | user_local   | user@example.com   | local
-- user_002 | user_google  | user@example.com   | google
```

## インデックス戦略

### idx_auth_user_id

```sql
CREATE INDEX idx_auth_user_id ON authentications(user_id);
```

**用途**: ユーザーの認証方法一覧を取得

```sql
-- このクエリが高速になる
SELECT * FROM authentications WHERE user_id = 'user_001';
```

**パフォーマンス**:

- インデックスなし: O(n) - 全行スキャン
- インデックスあり: O(log n) - B-tree 検索

### idx_auth_provider

```sql
CREATE INDEX idx_auth_provider ON authentications(provider, provider_id);
```

**用途**: OAuth ログイン時のユーザー検索

```sql
-- このクエリが高速になる
SELECT user_id FROM authentications
WHERE provider = 'github' AND provider_id = '12345678';
```

**複合インデックスの利点**:

- `provider` と `provider_id` の両方で検索する場合に最適
- `provider` だけでの検索にも使える

### idx_auth_email

```sql
CREATE INDEX idx_auth_email ON authentications(email);
```

**用途**: メールアドレスでの認証情報検索

```sql
-- このクエリが高速になる
SELECT * FROM authentications
WHERE email = 'user@example.com' AND provider = 'local';
```

**注意点**:

- `email` は NULL 可能なので、部分インデックスも検討可能
- ローカル認証の検索に使用

### インデックスのサイズ確認

```sql
-- インデックスのサイズを確認
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE tablename IN ('users', 'authentications');
```

## クエリ例

### ユーザー登録(トランザクション)

```sql
BEGIN;

-- 1. ユーザー作成
INSERT INTO users (id, username, email, created_at, last_login_at, preferences, profile)
VALUES (
  'user_abc123',
  'alice',
  'alice@example.com',
  NOW(),
  NOW(),
  '{"theme":"light","language":"ja","notifications":true}',
  '{"bio":"","avatarUrl":null,"location":"","website":""}'
)
RETURNING *;

-- 2. 認証情報作成
INSERT INTO authentications (id, user_id, provider, email, password_hash, created_at)
VALUES (
  'auth_xyz789',
  'user_abc123',
  'local',
  'alice@example.com',
  '$2b$10$abcdefghijklmnopqrstuvwxyz...',
  NOW()
)
RETURNING id;

COMMIT;
-- エラーが発生した場合は自動的に ROLLBACK
```

### ログイン

```sql
-- メールとプロバイダーで認証情報を取得
SELECT user_id, password_hash
FROM authentications
WHERE email = 'alice@example.com' AND provider = 'local';

-- 結果:
-- user_id      | password_hash
-- user_abc123  | $2b$10$...
```

### OAuth ログイン確認

```sql
-- GitHub でログインしたことがあるか確認
SELECT user_id
FROM authentications
WHERE provider = 'github' AND provider_id = '12345678';

-- 結果が NULL → 新規ユーザー
-- 結果が存在 → 既存ユーザー
```

### ユーザー情報 + 認証方法取得

```sql
-- ユーザー情報
SELECT * FROM users WHERE id = 'user_abc123';

-- 認証方法一覧
SELECT id, provider, email, created_at
FROM authentications
WHERE user_id = 'user_abc123'
ORDER BY created_at DESC;

-- 結果:
-- id          | provider | email              | created_at
-- auth_xyz789 | local    | alice@example.com  | 2024-11-09 12:00:00
```

### プリファレンス更新

**方法 1: PostgreSQL の JSONB 演算子**

```sql
-- 部分更新: theme だけ変更
UPDATE users
SET preferences = preferences || '{"theme":"dark"}'::jsonb
WHERE id = 'user_abc123'
RETURNING *;

-- 結果: theme だけ変更され、他のフィールドは保持される
-- {"theme":"dark","language":"ja","notifications":true}
```

**方法 2: JavaScript 側でマージして上書き**

```sql
-- 完全置換
UPDATE users
SET preferences = '{"theme":"dark","language":"ja","notifications":true}'::jsonb
WHERE id = 'user_abc123'
RETURNING *;
```

### 最終ログイン日時更新

```sql
UPDATE users
SET last_login_at = NOW()
WHERE id = 'user_abc123';
```

### ユーザー削除(CASCADE)

```sql
-- ユーザーを削除すると、認証情報も自動削除
DELETE FROM users WHERE id = 'user_abc123';

-- authentications テーブルからも自動的に削除される
-- (ON DELETE CASCADE のため)
```

### 統計クエリ

```sql
-- 総ユーザー数
SELECT COUNT(*) as total_users FROM users;

-- プロバイダー別の統計
SELECT
  provider,
  COUNT(*) as count,
  COUNT(*) * 100.0 / (SELECT COUNT(*) FROM authentications) as percentage
FROM authentications
GROUP BY provider
ORDER BY count DESC;

-- 結果例:
-- provider | count | percentage
-- local    | 150   | 60.0
-- github   | 70    | 28.0
-- google   | 30    | 12.0

-- 最近登録されたユーザー
SELECT username, email, created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 最近ログインしたユーザー
SELECT username, email, last_login_at
FROM users
ORDER BY last_login_at DESC
LIMIT 10;

-- メールアドレスが重複しているユーザー
SELECT email, COUNT(*) as count
FROM users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;
```

## データベース管理

### 接続

```bash
# Docker経由で接続
docker-compose exec postgres psql -U oauth_user -d oauth_practice

# 直接接続(PostgreSQLがローカルにインストールされている場合)
psql -h localhost -U oauth_user -d oauth_practice
```

### よく使うコマンド

```sql
-- データベース一覧
\l

-- テーブル一覧
\dt

-- テーブル構造確認
\d users
\d authentications

-- インデックス一覧
\di

-- データ確認
SELECT * FROM users;
SELECT * FROM authentications;

-- 件数確認
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM authentications;

-- 最近のデータ
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;

-- テーブルのサイズ
SELECT
  pg_size_pretty(pg_total_relation_size('users')) as users_size,
  pg_size_pretty(pg_total_relation_size('authentications')) as auth_size;

-- 終了
\q
```

### データのエクスポート/インポート

**CSV エクスポート:**

```sql
-- users テーブルをCSVにエクスポート
COPY users TO '/tmp/users.csv' CSV HEADER;

-- authentications テーブルをCSVにエクスポート
COPY authentications TO '/tmp/authentications.csv' CSV HEADER;
```

**CSV インポート:**

```sql
-- CSVからインポート
COPY users FROM '/tmp/users.csv' CSV HEADER;
COPY authentications FROM '/tmp/authentications.csv' CSV HEADER;
```

### テーブルのクリア

```bash
# PostgreSQL に接続
docker-compose exec postgres psql -U oauth_user -d oauth_practice
```

```sql
-- データを全削除(開発用)
TRUNCATE users RESTART IDENTITY CASCADE;
TRUNCATE authentications RESTART IDENTITY CASCADE;

-- 確認
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM authentications;
```

**TRUNCATE の説明:**

- `TRUNCATE`: テーブルのデータを全削除
- `RESTART IDENTITY`: シーケンスをリセット(今回は使っていないが、念のため)
- `CASCADE`: 外部キー制約を持つテーブルも連鎖削除

## バックアップとリストア

### バックアップ

```bash
# データベース全体をバックアップ
docker-compose exec postgres pg_dump -U oauth_user oauth_practice > backup.sql

# 圧縮してバックアップ
docker-compose exec postgres pg_dump -U oauth_user oauth_practice | gzip > backup.sql.gz

# 特定のテーブルのみバックアップ
docker-compose exec postgres pg_dump -U oauth_user -t users -t authentications oauth_practice > backup_tables.sql
```

### リストア

```bash
# バックアップから復元
docker-compose exec -T postgres psql -U oauth_user oauth_practice < backup.sql

# 圧縮ファイルから復元
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U oauth_user oauth_practice
```

### 定期バックアップ(本番環境)

**cron で自動バックアップ:**

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/oauth_practice_$DATE.sql.gz"

# バックアップ実行
docker-compose exec postgres pg_dump -U oauth_user oauth_practice | gzip > $BACKUP_FILE

# 7日以上古いバックアップを削除
find $BACKUP_DIR -name "oauth_practice_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

**crontab に登録:**

```bash
# 毎日午前3時にバックアップ
0 3 * * * /path/to/backup.sh
```

## パフォーマンスチューニング

### EXPLAIN で実行計画を確認

```sql
-- クエリの実行計画を確認
EXPLAIN ANALYZE
SELECT * FROM authentications WHERE email = 'alice@example.com';

-- 結果例:
-- Index Scan using idx_auth_email on authentications (cost=0.15..8.17 rows=1)
-- Index Cond: (email = 'alice@example.com')
-- Execution time: 0.123 ms
```

### スロークエリの確認

```sql
-- 実行時間が長いクエリを記録
ALTER DATABASE oauth_practice SET log_min_duration_statement = 1000;
-- 1秒以上かかるクエリをログに記録
```

### インデックスの使用状況確認

```sql
-- インデックスが使われているか確認
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 未使用インデックスの確認

```sql
-- 使われていないインデックスを見つける
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey';
```

### VACUUM と ANALYZE

```sql
-- テーブルの統計情報を更新
ANALYZE users;
ANALYZE authentications;

-- 不要な領域を回収
VACUUM users;
VACUUM authentications;

-- VACUUM と ANALYZE を同時実行
VACUUM ANALYZE users;
VACUUM ANALYZE authentications;
```

**本番環境での推奨設定:**

```sql
-- 自動VACUUM を有効化(デフォルトで有効)
ALTER TABLE users SET (autovacuum_enabled = true);
ALTER TABLE authentications SET (autovacuum_enabled = true);
```

### コネクションプールの最適化

```javascript
// src/database/connection.js の設定を調整

// 小規模アプリ(〜100同時接続)
max: 20;

// 中規模アプリ(〜500同時接続)
max: 50;

// 大規模アプリ(1000+同時接続)
max: 100;

// アイドルタイムアウトも調整
idleTimeoutMillis: 30000; // 30秒
```

## トラブルシューティング

### データベースが起動しない

```bash
# ログを確認
docker-compose logs postgres

# ポートが使われていないか確認
lsof -i :5432

# コンテナを再作成
docker-compose down -v
docker-compose up -d
```

### パスワード認証エラー

```bash
# DATABASE_URL を確認
cat .env | grep DATABASE_URL

# コンテナの環境変数を確認
docker-compose exec postgres env | grep POSTGRES
```

### ディスク容量不足

```bash
# データベースのサイズを確認
docker-compose exec postgres psql -U oauth_user -d oauth_practice -c "
SELECT
  pg_size_pretty(pg_database_size('oauth_practice')) as db_size;
"

# テーブルごとのサイズ
docker-compose exec postgres psql -U oauth_user -d oauth_practice -c "
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
"
```

### 外部キー制約違反

```sql
-- 孤立したデータを見つける
SELECT a.*
FROM authentications a
LEFT JOIN users u ON a.user_id = u.id
WHERE u.id IS NULL;

-- 孤立したデータを削除
DELETE FROM authentications
WHERE user_id NOT IN (SELECT id FROM users);
```

## まとめ

このドキュメントでは以下をカバーしました:

- ✅ テーブル設計と制約
- ✅ リレーションシップと ER 図
- ✅ 実際のデータ例
- ✅ インデックス戦略
- ✅ よく使うクエリ
- ✅ データベース管理コマンド
- ✅ バックアップとリストア
- ✅ パフォーマンスチューニング

詳細な実装については [ARCHITECTURE.md](./ARCHITECTURE.md) を参照してください。
