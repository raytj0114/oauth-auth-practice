import crypto from 'crypto';

class SessionManager {
  constructor(maxAge) {
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
  create(userId, userData) {
    const sessionId = this.generateSessionId();
    const session = {
      userId,
      userData,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.maxAge
    };

    this.sessions.set(sessionId, session);
    console.log(`[SessionManager] Created session: ${sessionId}`);
    console.log(`[SessionManager] Expires in: ${this.maxAge / 1000 / 60} minutes`);

    return sessionId;
  }

  get(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.log(`[SessionManager] Session not found: ${sessionId}`);
      return null;
    }

    // 有効期限チェック
    if (Date.now() > session.expiresAt) {
      console.log(`[SessionManager] Session expired: ${sessionId}`);
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  // セッション削除
  destroy(sessionId) {
    console.log(`[SessionManager] Destroyed session: ${sessionId}`);
    return this.sessions.delete(sessionId);
  }

  // セッションのユーザーデータを更新
  updateUserData(sessionId, userData) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.log(`[SessionManager] Session not found for update: ${sessionId}`);
      return false;
    }

    if (Date.now() > session.expiresAt) {
      console.log(`[SessionManager] Cannot update expired session: ${sessionId}`);
      this.sessions.delete(sessionId);
      return false;
    }

    session.userData = userData;
    console.log(`[SessionManager] Updated user data in session: ${sessionId}`);

    return true;
  }
  
  // 全セッション表示(デバッグ用)
  debug() {
    console.log('[SessionManager] Active sessions:', this.sessions.size);
    for (const [id, session] of this.sessions) {
      console.log(` ${id}: User ${session.userId}`);
    }
  }
}

// 環境変数から有効期限を取得してインスタンス化
const maxAge = parseInt(process.env.SESSION_MAX_AGE) || 86400000;
export default new SessionManager(maxAge);