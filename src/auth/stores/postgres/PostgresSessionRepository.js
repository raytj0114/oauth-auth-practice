import crypto from 'crypto';
import DatabaseConnection from '../../../database/connection.js';

/**
 * PostgreSQL版 SessionRepository
 */
class PostgresSessionRepository {
  constructor(maxAge = 86400000) {
    this.maxAge = maxAge; // デフォルト24時間
  }

  /**
   * セッションID生成
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * セッション作成
   */
  async create(userId, userData) {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + this.maxAge);

    const query = `
      INSERT INTO sessions (id, user_id, data, expires_at, created_at, last_accessed_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;

    try {
      await DatabaseConnection.query(query, [
        sessionId,
        userId,
        JSON.stringify(userData),
        expiresAt,
      ]);

      console.log(`[PostgresSessionRepository] Session created: ${sessionId}`);
      console.log(`[PostgresSessionRepository] Expires at: ${expiresAt}`);

      return sessionId;
    } catch (error) {
      console.error('[PostgresSessionRepository] Create error:', error.message);
      throw error;
    }
  }

  /**
   * セッション取得
   */
  async get(sessionId) {
    const query = `
      SELECT * FROM sessions
      WHERE id = $1 AND expires_at > NOW()
    `;

    try {
      const result = await DatabaseConnection.query(query, [sessionId]);

      if (result.rows.length === 0) {
        console.log(`[PostgresSessionRepository] Session not found or expired: ${sessionId}`);
        return null;
      }

      const session = result.rows[0];

      // 最終アクセス日時を更新
      await this.updateLastAccessed(sessionId);

      return {
        userId: session.user_id,
        userData: session.data, // PostgreSQLが自動でパース
        createdAt: session.created_at.getTime(),
        expiresAt: session.expires_at.getTime(),
      };
    } catch (error) {
      console.error('[PostgresSessionRepository] Get error:', error.message);
      throw error;
    }
  }

  /**
   * 最終アクセス日時を更新
   */
  async updateLastAccessed(sessionId) {
    const query = `
      UPDATE sessions
      SET last_accessed_at = NOW()
      WHERE id = $1
    `;

    try {
      await DatabaseConnection.query(query, [sessionId]);
    } catch (error) {
      console.error('[PostgresSessionRepository] UpdateLastAccessed error:', error.message);
      // エラーでも続行(重要な処理ではない)
    }
  }

  /**
   * セッションのユーザーデータを更新
   */
  async updateUserData(sessionId, userData) {
    const query = `
      UPDATE sessions
      SET data = $1, last_accessed_at = NOW()
      WHERE id = $2 AND expires_at > NOW()
      RETURNING *
    `;

    try {
      const result = await DatabaseConnection.query(query, [JSON.stringify(userData), sessionId]);

      if (result.rows.length === 0) {
        console.log(`[PostgresSessionRepository] Session not found for update: ${sessionId}`);
        return false;
      }

      console.log(`[PostgresSessionRepository] Updated user data in session: ${sessionId}`);
      return true;
    } catch (error) {
      console.error('[PostgresSessionRepository] UpdateUserData error:', error.message);
      throw error;
    }
  }

  /**
   * セッション削除
   */
  async destroy(sessionId) {
    const query = 'DELETE FROM sessions WHERE id = $1';

    try {
      const result = await DatabaseConnection.query(query, [sessionId]);
      console.log(`[PostgresSessionRepository] Session destroyed: ${sessionId}`);
      return result.rowCount > 0;
    } catch (error) {
      console.error('[PostgresSessionRepository] Destroy error:', error.message);
      throw error;
    }
  }

  /**
   * 特定ユーザーの全セッションを削除
   */
  async destroyAllForUser(userId) {
    const query = 'DELETE FROM sessions WHERE user_id = $1';

    try {
      const result = await DatabaseConnection.query(query, [userId]);
      console.log(
        `[PostgresSessionRepository] Destroyed ${result.rowCount} sessions for user: ${userId}`
      );
      return result.rowCount;
    } catch (error) {
      console.error('[PostgresSessionRepository] DestroyAllForUser error:', error.message);
      throw error;
    }
  }

  /**
   * 期限切れセッションを削除
   */
  async cleanupExpired() {
    const query = 'DELETE FROM sessions WHERE expires_at < NOW()';

    try {
      const result = await DatabaseConnection.query(query);

      if (result.rowCount > 0) {
        console.log(`[PostgresSessionRepository] Cleaned up ${result.rowCount} expired sessions`);
      }

      return result.rowCount;
    } catch (error) {
      console.error('[PostgresSessionRepository] CleanupExpired error:', error.message);
      throw error;
    }
  }

  /**
   * ユーザーのアクティブセッション一覧を取得
   */
  async getActiveSessionsForUser(userId) {
    const query = `
      SELECT id, created_at, last_accessed_at, expires_at
      FROM sessions
      WHERE user_id = $1 AND expires_at > NOW()
      ORDER BY last_accessed_at DESC
    `;

    try {
      const result = await DatabaseConnection.query(query, [userId]);

      return result.rows.map((row) => ({
        sessionId: row.id,
        createdAt: row.created_at.getTime(),
        lastAccessedAt: row.last_accessed_at.getTime(),
        expiresAt: row.expires_at.getTime(),
      }));
    } catch (error) {
      console.error('[PostgresSessionRepository] GetActiveSessionsForUser error:', error.message);
      throw error;
    }
  }

  /**
   * デバッグ
   */
  async debug() {
    const query = `
      SELECT
        s.id,
        s.user_id,
        u.username,
        s.created_at,
        s.last_accessed_at,
        s.expires_at
      FROM sessions s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.last_accessed_at DESC
    `;

    try {
      const result = await DatabaseConnection.query(query);

      console.log('\n[PostgresSessionRepository] Debug Info:');
      console.log('Active sessions:', result.rows.length);

      for (const row of result.rows) {
        console.log(`\nSession: ${row.id}`);
        console.log(' User:', row.username, `(${row.user_id})`);
        console.log(' Created:', row.created_at);
        console.log(' Last accessed:', row.last_accessed_at);
        console.log(' Expires:', row.expires_at);
      }
    } catch (error) {
      console.error('[PostgresSessionRepository] Debug error:', error.message);
    }
  }
}

export default PostgresSessionRepository;
