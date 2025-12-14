import crypto from 'crypto';

/**
 * ユーザー情報のみを管理
 * 認証情報は一切持たない
 */
class UserRepository {
  constructor() {
    // ユーザー情報
    this.users = new Map();
  }

  // ユーザーID生成
  generateUserId() {
    return 'user_' + crypto.randomBytes(16).toString('hex');
  }

  // ユーザー作成
  create({ username, email, avatarUrl = null }) {
    const userId = this.generateUserId();

    const user = {
      id: userId,
      username: username,
      email: email,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),

      // アプリ固有のデータ
      preferences: {
        theme: 'light',
        language: 'ja',
        notifications: true,
      },
      profile: {
        bio: '',
        avatarUrl: avatarUrl,
        location: '',
        website: '',
      },
    };

    this.users.set(userId, user);
    console.log(`[UserRepository] User created: ${userId}`);

    return user;
  }

  // ユーザー取得
  findById(userId) {
    return this.users.get(userId) || null;
  }

  // 最終ログイン日時を更新
  updateLastLogin(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.lastLoginAt = Date.now();
    }
  }

  // プリファレンス更新
  updatePreferences(userId, preferences) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.preferences = { ...user.preferences, ...preferences };
    console.log(`[UserRepository] Updated preferences for user: ${userId}`);

    return user;
  }

  // プロフィール更新
  updateProfile(userId, profile) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.profile = { ...user.profile, ...profile };
    console.log(`[UserRepository] Updated profile for user: ${userId}`);

    return user;
  }

  // デバッグ
  debug() {
    console.log('\n[UserRepository] Debug Info:');
    console.log('Total users:', this.users.size);

    for (const [userId, user] of this.users) {
      console.log(`\nUser: ${userId}`);
      console.log(' Username:', user.username);
      console.log(' Email:', user.email);
      console.log(' Created:', new Date(user.createdAt).toLocaleString());
    }
  }
}

export default new UserRepository();
