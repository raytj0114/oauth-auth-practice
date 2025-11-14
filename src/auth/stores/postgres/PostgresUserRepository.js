import crypto from 'crypto';
import DatabaseConnection from '../../../database/connection.js';

/**
 * PostgreSQL版 UserRepository
 * メモリ版と同じインターフェースを実装
 */
class PostgresUserRepository {
  // ユーザーID生成
  generateUserId() {
    return 'user_' + crypto.randomBytes(16).toString('hex');
  }

  // ユーザー作成
  async create({ username, email, avatarUrl = null }) {
    const userId = this.generateUserId();

    const query = `
      INSERT INTO users (
        id, username, email, created_at, last_login_at,
        preferences, profile
      ) VALUES (
        $1, $2, $3, NOW(), NOW(),
        $4, $5
      )
      RETURNING *
    `;

    const preferences = { theme: 'light', language: 'ja', notifications: true };
    const profile = { bio: '', avatarUrl, location: '', website: '' };

    const values = [
      userId,
      username,
      email,
      JSON.stringify(preferences),
      JSON.stringify(profile)
    ];

    try {
      const result = await DatabaseConnection.query(query, values);
      const user = this.mapRowToUser(result.rows[0]);
      
      console.log(`[PostgresUserRepository] User created: ${userId}`);
      return user;
    } catch (error) {
      console.error('[PostgresUserRepository] Create error:', error.message);
      throw error;
    }
  }

  // ユーザー取得
  async findById(userId) {
    const query = 'SELECT * FROM users WHERE id = $1';

    try {
      const result = await DatabaseConnection.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      console.error('[PostgresUserRepository] FindById error:', error.message);
      throw error;
    }
  }

  // 最終ログイン日時を更新
  async updateLastLogin(userId) {
    const query = `
      UPDATE users
      SET last_login_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await DatabaseConnection.query(query, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      console.log(`[PostgresUserRepository] Updated last login: ${userId}`);
    } catch (error) {
      console.error('[PostgresUserRepository] UpdateLastLogin error:', error.message);
      throw error;
    }
  }

  // プリファレンス更新
  async updatePreferences(userId, preferences) {
    // 既存のpreferencesを取得
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // マージ
    const updatedPreferences = { ...user.preferences, ...preferences };

    const query = `
      UPDATE users
      SET preferences = $1
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await DatabaseConnection.query(query, [
        JSON.stringify(updatedPreferences),
        userId
      ]);

      console.log(`[PostgresUserRepository] Updated preferences: ${userId}`);
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      console.error('[PostgresUserRepository] UpdatePreferences error:', error.message);
      throw error;
    }
  }

  // プロフィール更新
  async updateProfile(userId, profile) {
    // 既存のprofileを取得
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // マージ
    const updatedProfile = { ...user.profile, ...profile };

    const query = `
      UPDATE users
      SET profile = $1
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await DatabaseConnection.query(query, [
        JSON.stringify(updatedProfile),
        userId
      ]);

      console.log(`[PostgresUserRepository] Updated profile: ${userId}`);
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      console.error('[PostgresUserRepository] UpdateProfile error:', error.message);
      throw error;
    }
  }

  // デバッグ
  async debug() {
    const query = 'SELECT id, username, email, created_at FROM users';

    try {
      const result = await DatabaseConnection.query(query, []);

      console.log('\n[PostgresUserRepository] Debug Info:');
      console.log('Total users:', result.rows.length);
    
      for (const row of result.rows) {
        console.log(`\nUser: ${row.id}`);
        console.log('  Username:', row.username);
        console.log('  Email:', row.email);
        console.log('  Created:', row.created_at);
      }
    } catch (error) {
      console.error('[PostgresUserRepository] Debug error:', error.message);
    }
  }

  /**
   * データベースの行をUserオブジェクトに変換
   * 
   * PostgreSQLの型 → JavaScript の型
   * - TIMESTAMP → Date
   * - JSONB → Object
   */
  mapRowToUser(row) {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: row.created_at.getTime(), // Date → ミリ秒
      lastLoginAt: row.last_login_at.getTime(),
      preferences: row.preferences, // PostgreSQLが自動でパース
      profile: row.profile
    };
  }
}

export default PostgresUserRepository;