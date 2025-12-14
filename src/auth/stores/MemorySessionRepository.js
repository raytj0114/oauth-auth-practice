import crypto from 'crypto';

/**
 * メモリ版 SessionRepository
 * PostgreSQL版と同じインターフェース
 */
class MemorySessionRepository {
  constructor(maxAge = 86400000) {
    // セッションを保存する入れ物
    this.sessions = new Map();

    // セッション有効期限(環境変数から受け取る)
    this.maxAge = maxAge;
  }

  // セッションID生成
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  // セッション生成
  async create(userId, userData) {
    const sessionId = this.generateSessionId();
    const session = {
      userId,
      userData,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.maxAge,
      lastAccessedAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    console.log(`[MemorySessionRepository] Created session: ${sessionId}`);
    console.log(`[MemorySessionRepository] Expires in: ${this.maxAge / 1000 / 60} minutes`);

    return sessionId;
  }

  async get(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.log(`[MemorySessionRepository] Session not found: ${sessionId}`);
      return null;
    }

    // 有効期限チェック
    if (Date.now() > session.expiresAt) {
      console.log(`[MemorySessionRepository] Session expired: ${sessionId}`);
      this.sessions.delete(sessionId);
      return null;
    }

    // 最終アクセス更新
    session.lastAccessedAt = Date.now();

    return session;
  }

  // セッションのユーザーデータを更新
  async updateUserData(sessionId, userData) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.log(`[MemorySessionRepository] Session not found for update: ${sessionId}`);
      return false;
    }

    if (Date.now() > session.expiresAt) {
      console.log(`[MemorySessionRepository] Cannot update expired session: ${sessionId}`);
      this.sessions.delete(sessionId);
      return false;
    }

    session.userData = userData;
    session.lastAccessedAt = Date.now();
    console.log(`[MemorySessionRepository] Updated user data in session: ${sessionId}`);

    return true;
  }

  // セッション削除
  async destroy(sessionId) {
    console.log(`[MemorySessionRepository] Destroyed session: ${sessionId}`);
    return this.sessions.delete(sessionId);
  }

  // 特定ユーザーの全セッションを削除
  async destroyAllForUser(userId) {
    let count = 0;
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        count++;
      }
    }
    return count;
  }

  // 期限切れセッションを削除
  async cleanupExpired() {
    const now = Date.now();
    let count = 0;

    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        count++;
      }
    }

    if (count > 0) {
      console.log(`[MemorySessionRepository] Cleaned up ${count} expired sessions`);
    }

    return count;
  }

  // ユーザーのアクティブセッション一覧を取得
  async getActiveSessionsForUser(userId) {
    const sessions = [];
    const now = Date.now();

    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId && now <= session.expiresAt) {
        sessions.push({
          sessionId,
          createdAt: session.createdAt,
          lastAccessedAt: session.lastAccessedAt,
          expiresAt: session.expiresAt,
        });
      }
    }

    return sessions.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
  }

  // 全セッション表示(デバッグ用)
  async debug() {
    console.log('\n[MemorySessionRepository] Debug Info:');
    console.log('Active sessions:', this.sessions.size);

    for (const [sessionId, session] of this.sessions) {
      console.log(`\nSession: ${sessionId}`);
      console.log(' UserId:', session.userId);
      console.log(' Created:', new Date(session.createdAt));
      console.log(' Last accessed:', new Date(session.lastAccessedAt));
      console.log(' Expires:', new Date(session.expiresAt));
    }
  }
}

export default MemorySessionRepository;
