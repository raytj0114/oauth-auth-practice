import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * PostgreSQL接続プール
 *
 * プールとは:
 * - データベース接続を使い回す仕組み
 * - 毎回接続を作るとコストが高い
 * - プールから借りて、使い終わったら返す
 */
class DatabaseConnection {
  constructor() {
    this.pool = null;
  }

  /**
   * 接続プールを初期化
   */
  initialize() {
    if (this.pool) {
      console.log('[Database] Connection pool already initialized');
      return;
    }

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set in environment variables');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 20, // 最大接続数
      idleTimeoutMillis: 30000, // アイドル接続のタイムアウト(30秒)
      connectionTimeoutMillis: 2000, // 接続タイムアウト(2秒)
    });

    // エラーハンドリング
    this.pool.on('error', (err) => {
      console.log(`[Database] Unexpected error on idle client`, err);
      process.exit(-1);
    });

    console.log('[Database] Connection pool initialized');
  }

  /**
   * プールを取得
   */
  getPool() {
    if (!this.pool) {
      console.log('Database pool not initialized. Call initialize() fist.');
    }
    return this.pool;
  }

  /**
   * クエリを実行
   *
   * @param {string} text - SQL文
   * @param {Array} params - パラメータ($1, $2, ...)
   * @returns {Promise<Object>} クエリ結果
   */
  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('[Database] Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('[Database] Query error', { text, error: error.message });
      throw error;
    }
  }

  /**
   * トランザクション実行
   *
   * トランザクションとは:
   * - 複数のクエリをまとめて実行
   * - すべて成功 or すべて失敗(中途半端な状態を防ぐ)
   *
   * @param {Function} callback - トランザクション内で実行する処理
   */
  async transaction(callback) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      console.log('[Database] Transaction committed');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[Database] Transaction rolled back', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 接続をテスト
   */
  async testConnection() {
    try {
      const result = await this.query('SELECT NOW() as now, version() as version');
      console.log('[Database] Connection test successful');
      console.log('[Database] Server time:', result.rows[0].now);
      console.log('[Database] PostgreSQL version:', result.rows[0].version);
      return true;
    } catch (error) {
      console.error('[Database] Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * プールを閉じる
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('[Database] Connection pool closed');
      this.pool = null;
    }
  }
}

// シングルトンインスタンス
export default new DatabaseConnection();
