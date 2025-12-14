import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * 認証情報のみを管理
 * ユーザー情報は持たない
 */
class AuthRepository {
  constructor() {
    // 認証情報
    this.authentications = new Map();

    // インデックス: provider:providerId => authId
    this.providerIndex = new Map();

    // インデックス: email => [authId, authId, ...]
    // 注意: 同じメールアドレスで複数の認証が存在可能
    this.emailIndex = new Map();
  }

  // 認証ID生成
  generateAuthId() {
    return 'auth_' + crypto.randomBytes(16).toString('hex');
  }

  // ===== ローカル認証(メール/パスワード) =====

  // ローカル認証を作成
  async createLocal(userId, email, password) {
    console.log(`[AuthRepository] Creating local auth for user: ${userId}`);

    // 既存チェック(同じuserIdでローカル認証は1つだけ)
    for (const auth of this.authentications.values()) {
      if (auth.userId === userId && auth.provider === 'local') {
        throw new Error('Local authentication already exists for this user');
      }
    }

    // メールアドレスの重複チェック
    const authIds = this.emailIndex.get(email);
    if (authIds) {
      for (const authId of authIds) {
        const auth = this.authentications.get(authId);
        if (auth && auth.provider === 'local') {
          throw new Error('Email already registered');
        }
      }
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    const authId = this.generateAuthId();
    const auth = {
      id: authId,
      userId: userId,
      provider: 'local',
      providerId: null,
      email: email,
      passwordHash: passwordHash,
      createdAt: Date.now()
    };

    this.authentications.set(authId, auth);

    // メールインデックスに追加
    if (!this.emailIndex.has(email)) {
      this.emailIndex.set(email, []);
    }
    this.emailIndex.get(email).push(authId);

    console.log(`[AuthRepository] Local auth created: ${authId}`);
    return authId;
  }

  // メール/パスワードで認証を探す
  async verifyLocalPassword(email, password) {
    console.log(`[AuthRepository] Verifying password for: ${email}`);
    
    const authIds = this.emailIndex.get(email);
    if (!authIds) {
      console.log('[AuthRepository] No auth found for email');
      return null;
    }

    // ローカル認証を探す
    for (const authId of authIds) {
      const auth = this.authentications.get(authId);

      if (auth && auth.provider === 'local' && auth.passwordHash) {
        // パスワード検証
        const isValid = await bcrypt.compare(password, auth.passwordHash);

        if (isValid) {
          console.log(`[AuthRepository] Password valid, userId: ${auth.userId}`);
          return auth.userId;
        }
      }
    }

    console.log('[AuthRepository] Invalid password');
    return null;
  }

  // ===== OAuth認証 =====
  
  // OAuth認証を作成
  createOAuth(userId, provider, providerId, email) {
    console.log(`[AuthRepository] Creating OAuth auth: ${provider} for user: ${userId}`);

    const providerKey = `${provider}:${providerId}`;

    // 既存チェック
    if (this.providerIndex.has(providerKey)) {
      throw new Error('This OAuth account is already linked');
    }

    const authId = this.generateAuthId();
    const auth = {
      id: authId,
      userId: userId,
      provider: provider,
      providerId: providerId,
      email: email,
      passwordHash: null,
      createdAt: Date.now()
    };

    this.authentications.set(authId, auth);
    this.providerIndex.set(providerKey, authId);

    // メールインデックスに追加
    if (email) {
      if (!this.emailIndex.has(email)) {
        this.emailIndex.set(email, []);
      }
      this.emailIndex.get(email).push(authId);
    }

    console.log(`[AuthRepository] OAuth auth created: ${authId}`);
    return authId;
  }

  // OAuth認証でuserIdを取得
  findUserByOAuth(provider, providerId) {
    const providerKey = `${provider}:${providerId}`;
    const authId = this.providerIndex.get(providerKey);

    if (!authId) {
      return null;
    }

    const auth = this.authentications.get(authId);
    return auth ? auth.userId : null;
  }

  // ===== ユーザーの認証方法を取得 =====

  // 特定ユーザーの全認証方法を取得
  findAuthsByUserId(userId) {
    const auths = [];

    for (const auth of this.authentications.values()) {
      if (auth.userId === userId) {
        // パスワードハッシュは含めない
        auths.push({
          id: auth.id,
          provider: auth.provider,
          email: auth.email,
          createdAt: auth.createdAt
        });
      }
    }

    return auths; 
  }

  // デバッグ
  debug() {
    console.log('\n[AuthRepository] Debug Info:');
    console.log('Total authentications:', this.authentications.size);
    
    for (const [authId, auth] of this.authentications) {
      console.log(`\nAuth: ${authId}`);
      console.log(' UserId:', auth.userId);
      console.log(' Provider:', auth.provider);
      console.log(' Email:', auth.email);
      console.log(' Has password:', auth.passwordHash ? 'Yes' : 'No');
    }
  }
}

export default new AuthRepository();