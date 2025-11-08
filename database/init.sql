-- 初回起動時に実行されるSQL

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
  -- 外部キー制約
  -- users が削除されたら、その authentications も自動削除
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
  provider VARCHAR(50) NOT NULL,
  provider_id VARCHAR(255),
  email VARCHAR(255),
  password_hash VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- 制約: 同じprovider + provider_idの組み合わせは1つだけ
  -- 同じOAuthアカウントは1つだけ登録可能
  UNIQUE(provider, provider_id)
);

-- インデックス: 検索を高速化
CREATE INDEX idx_auth_user_id ON authentications(user_id);
CREATE INDEX idx_auth_provider ON authentications(provider, provider_id);
CREATE INDEX idx_auth_email ON authentications(email);

-- コメント追加
COMMENT ON TABLE users IS 'ユーザー情報テーブル';
COMMENT ON TABLE authentications IS '認証情報テーブル';

COMMENT ON COLUMN users.preferences IS 'ユーザー設定(JSON): theme, language等';
COMMENT ON COLUMN users.profile IS 'プロフィール(JSON): bio, avatarUrl等';

COMMENT ON COLUMN authentications.provider IS '認証プロバイダー: local, github, google';
COMMENT ON COLUMN authentications.provider_id IS 'OAuth プロバイダーのユーザーID(localの場合はNULL)';
COMMENT ON COLUMN authentications.password_hash IS 'パスワードハッシュ(localの場合のみ)';