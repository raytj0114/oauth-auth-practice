import dotenv from 'dotenv';

dotenv.config();

/**
 * 
 * 環境変数(USE_DATABASE)に応じて、
 * メモリ版 or PostgreSQL版 のRepositoryを返す
 */
class RepositoryFactory {
  constructor() {
    this.useDatabase = process.env.USE_DATABASE === 'true';
    this.userRepository = null;
    this.authRepository = null;
  }

  /**
   * UserRepository を取得
   */
  async getUserRepository() {
    if (this.userRepository) {
      return this.userRepository;
    }

    if (this.useDatabase) {
      // PostgreSQL版
      const { default: PostgresUserRepository } = await import('./postgres/PostgresUserRepository.js');
      this.userRepository = new PostgresUserRepository();
      console.log('[RepositoryFactory] Using PostgresUserRepository');
    } else {
      // メモリ版
      const { default: MemoryUserRepository } = await import('./UserRepository.js');
      this.userRepository = MemoryUserRepository; // すでにシングルトン
      console.log('[RepositoryFactory] Using MemoryUserRepository');
    }

    return this.userRepository;
  }

  /**
   * AuthRepository を取得
   */
  async getAuthRepository() {
    if (this.authRepository) {
      return this.authRepository;
    }

    if (this.useDatabase) {
      // PostgreSQL版
      const { default: PostgresAuthRepository } = await import('./postgres/PostgresAuthRepository.js');
      this.authRepository = new PostgresAuthRepository();
      console.log('[RepositoryFactory] Using PostgresAuthRepository');
    } else {
      // メモリ版
      const { default: MemoryAuthRepository } = await import('./AuthRepository.js');
      this.authRepository = MemoryAuthRepository; // すでにシングルトン
      console.log('[RepositoryFactory] Using MemoryAuthRepository');
    }

    return this.authRepository;
  }

  /**
   * 使用中のストレージタイプを取得
   */
  getStorageType() {
    return this.useDatabase ? 'PostgreSQL' : 'Memory';
  }
}

export default new RepositoryFactory();