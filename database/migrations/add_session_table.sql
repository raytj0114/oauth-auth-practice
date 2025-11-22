-- Session テーブル
CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- コメント
COMMENT ON TABLE sessions IS 'ユーザーセッション情報';
COMMENT ON COLUMN sessions.id IS 'セッションID';
COMMENT ON COLUMN sessions.user_id IS 'ユーザーID';
COMMENT ON COLUMN sessions.data IS 'セッションデータ(JSON)';
COMMENT ON COLUMN sessions.expires_at IS '有効期限';
COMMENT ON COLUMN sessions.created_at IS '最終アクセス日時';