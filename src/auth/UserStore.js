import crypto from 'crypto';
import bcrypt from 'bcrypt';

class UserStore {
  constructor() {
    //　ユーザー情報を更新
    this.users = new Map();
    // メールアドレスでユーザーIDを検索するためのインデックス
    this.emailIndex = new Map();
  }

  // ユーザーID生成
  generateUserId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // ユーザー登録
  async create(email, password, username) {
    console.log(`[UserStore] Creating user: ${email}`);

    // 既に存在するか確認
    if (this.emailIndex.has(email)) {
      throw new Error('Email already exists');
    }

    // パスワードをハッシュ化
    // saltRounds=10: ハッシュの強度(高いほど安全だが遅い)
    const passwordHash = await bcrypt.hash(password, 10);

    const userId = this.generateUserId();
    const user = {
      id: userId,
      email: email,
      username: username,
      passwordHash: passwordHash, // ← ハッシュ化されたパスワード
      createdAt: Date.now(),
      provider: 'local' // OAuth と区別するため
    };

    // 保存
    this.users.set(userId, user);
    this.emailIndex.set(email, userId);
    
    console.log(`[UserStore] User created: ${userId}`);

    // パスワードハッシュは返さない
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      provider: user.provider
    };
  }

  // メールアドレスでユーザーを検索
  findByEmail(email) {
    const userId = this.emailIndex.get(email);
    if (!userId) {
      return null;
    }
    return this.users.get(userId);
  }

  // IDでユーザーを検索
  findById(id) {
    return this.users.get(id);
  }

  // パスワード検証
  async verifyPassword(email, password) {
    console.log(`[UserStore] Verifying password for: ${email}`);

    const user = this.findByEmail(email);
    if (!user) {
      console.log(`[UserStore] User not found`);
      return null;
    }

    // パスワードをハッシュと比較
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      console.log(`[UserStore] Invalid password`);
      return null;
    }

    console.log(`[UserStore] Password valid`);

    // パスワードハッシュを返さない
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      provider: user.provider
    };
  }

  // デバッグ用
  debug() {
    console.log('[UserStore] Registered users:', this.users.size);
    for (const [id, user] of this.users) {
      console.log(`${id}: ${user.email} (${user.username})`);
    }
  }
}

export default new UserStore();