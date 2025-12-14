import RepositoryFactory from './stores/RepositoryFactory.js';

/**
 * SessionManager
 * Repository を使用した薄いラッパー
 */
class SessionManager {
  constructor() {
    this.repository = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    this.repository = await RepositoryFactory.getSessionRepository();
    this.initialized = true;

    // 定期的に期限切れセッションを削除
    this.startCleanupTask();

    console.log('[SessionManager] Initialized');
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async create(userId, userData) {
    await this.ensureInitialized();
    return await this.repository.create(userId, userData);
  }

  async get(sessionId) {
    await this.ensureInitialized();
    return await this.repository.get(sessionId);
  }

  async updateUserData(sessionId, userData) {
    await this.ensureInitialized();
    return await this.repository.updateUserData(sessionId, userData);
  }

  async destroy(sessionId) {
    await this.ensureInitialized();
    return await this.repository.destroy(sessionId);
  }

  async destroyAllForUser(userId) {
    await this.ensureInitialized();
    return await this.repository.destroyAllForUser(userId);
  }

  async getActiveSessionsForUser(userId) {
    await this.ensureInitialized();
    return await this.repository.getActiveSessionsForUser(userId);
  }

  /**
   * 定期的に期限切れセッションを削除
   */
  startCleanupTask() {
    // 1時間ごとにクリーンアップ
    setInterval(
      async () => {
        try {
          await this.repository.cleanupExpired();
        } catch (error) {
          console.error('[SessionManager] Cleanup task error:', error);
        }
      },
      60 * 60 * 1000
    ); // 1時間

    console.log('[SessionManager] Cleanup task started (runs every hour)');
  }

  async debug() {
    await this.ensureInitialized();
    await this.repository.debug();
  }
}

export default new SessionManager();
