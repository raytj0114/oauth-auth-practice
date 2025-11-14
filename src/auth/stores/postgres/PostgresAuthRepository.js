import crypto from 'crypto';
import bcrypt from 'bcrypt';
import DatabaseConnection from '../../../database/connection.js';

/**
 * PostgreSQL版 AuthRepository
 * メモリ版と同じインターフェースを実装
 */
class PostgresAuthRepository {
  // 認証ID生成
  generateAuthId() {
    return 'auth_' + crypto.randomBytes(16).toString('hex');
  }

  // ===== ローカル認証(メール/パスワード) =====

  // ローカル認証を作成
  async createLocal(userId, email, password) {
    console.log(`[PostgresAuthRepository] Creating local auth for user: ${userId}`);

    // 既存チェック(同じuserIdでローカル認証は1つだけ)
    const checkQuery = `
      SELECT id FROM authentications
      WHERE user_id = $1 AND provider = 'local'
    `;
    const checkResult = await DatabaseConnection.query(checkQuery, [userId]);

    if (checkResult.rows.length > 0) {
      throw new Error('Local authentication already exists for this user');
    }

    // メールアドレスの重複チェック
    const emailCheckQuery = `
      SELECT id FROM authentications
      WHERE email = $1 AND provider = 'local'
    `;
    const emailCheckResult = await DatabaseConnection.query(emailCheckQuery, [email]);

    if (emailCheckResult.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    const authId = this.generateAuthId();

    const query = `
      INSERT INTO authentications (
        id, user_id, provider, provider_id, email, password_hash, created_at
      ) VALUES (
        $1, $2, 'local', NULL, $3, $4, NOW()
      )
      RETURNING id
    `;

    const values = [authId, userId, email, passwordHash];
    
    try {
      await DatabaseConnection.query(query, values);
      console.log(`[PostgresAuthRepository] Local auth created: ${authId}`);
      return authId;
    } catch (error) {
      console.error('[PostgresAuthRepository] CreateLocal error:', error.message);
      throw error;
    }
  }

  // メール/パスワードで認証
  async verifyLocalPassword(email, password) {
    console.log(`[PostgresAuthRepository] Verifying password for: ${email}`);
    
    const query = `
      SELECT user_id, password_hash
      FROM authentications
      WHERE email = $1 AND provider = 'local'
    `;

    try {
      const result = await DatabaseConnection.query(query, [email]);

      if (result.rows.length === 0) {
        console.log(`[PostgresAuthRepository] No auth found for email`);
        return null;
      }

      const auth = result.rows[0];

      // パスワード検証
      const isValid = await bcrypt.compare(password, auth.password_hash);

      if (!isValid) {
        console.log(`[PostgresAuthRepository] Invalid password`);
        return null;
      }

      console.log(`[PostgresAuthRepository] Password valid, userId: ${auth.user_id}`);
      return auth.user_id;
    } catch (error) {
      console.error('[PostgresAuthRepository] VerifyLocalPassword error:', error.message);
      throw error;
    }
  }

  // ===== OAuth認証 =====
  
  // OAuth認証を作成
  async createOAuth(userId, provider, providerId, email) {
    console.log(`[PostgresAuthRepository] Creating OAuth auth: ${provider} for user: ${userId}`);

    // 既存チェック
    const checkQuery = `
      SELECT id FROM authentications
      WHERE provider = $1 AND provider_id = $2
    `;
    const checkResult = await DatabaseConnection.query(checkQuery, [provider, providerId]);

    if (checkResult.rows.length > 0) {
      throw new Error('This OAuth account is already linked');
    }

    const authId = this.generateAuthId();

    const query = `
      INSERT INTO authentications (
        id, user_id, provider, provider_id, email, password_hash, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, NULL, NOW()
      )
      RETURNING id
    `;

    const values = [authId, userId, provider, providerId, email];

    try {
      await DatabaseConnection.query(query, values);
      console.log(`[PostgresAuthRepository] OAuth auth created: ${authId}`);
      return authId;
    } catch (error) {
      console.error('[PostgresAuthRepository] CreateOAuth error:', error.message);
      throw error;
    }
  }

  // OAuth認証でuserIdを取得
  async findUserByOAuth(provider, providerId) {
    const query = `
      SELECT user_id
      FROM authentications
      WHERE provider = $1 AND provider_id = $2
    `;

    try {
      const result = await DatabaseConnection.query(query, [provider, providerId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].user_id;
    } catch (error) {
      console.error('[PostgresAuthRepository] FindUserByOAuth error:', error.message);
      throw error;
    }
  }

  // ===== ユーザーの認証方法を取得 =====

  // 特定ユーザーの全認証方法を取得
  async findAuthsByUserId(userId) {
    const query = `
      SELECT id, provider, email, created_at
      FROM authentications
      WHERE user_id = $1
    `;

    try {
      const result = await DatabaseConnection.query(query, [userId]);

      return result.rows.map(row => ({
        id: row.id,
        provider: row.provider,
        email: row.email,
        createdAt: row.created_at.getTime()
      }));
    } catch (error) {
      console.error('[PostgresAuthRepository] FindAuthsByUserId error:', error.message);
      throw error;
    }
  }

  // デバッグ
  async debug() {
    const query = `
      SELECT id, user_id, provider, email, created_at
      FROM authentications
    `;

    try {
      const result = await DatabaseConnection.query(query, []);
    
      console.log('\n[PostgresAuthRepository] Debug Info:');
      console.log('Total authentications:', result.rows.length);
    
      for (const row of result.rows) {
        console.log(`\nAuth: ${row.id}`);
        console.log('  UserId:', row.user_id);
        console.log('  Provider:', row.provider);
        console.log('  Email:', row.email);
        console.log('  Has password:', row.password_hash ? 'Yes' : 'No');
      }
    } catch (error) {
      console.error('[PostgresAuthRepository] Debug error:', error.message);
    }
  }
}

export default PostgresAuthRepository;