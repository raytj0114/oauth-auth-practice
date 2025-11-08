import UserRepository from './stores/UserRepository.js';
import AuthRepository from './stores/AuthRepository.js';

/**
 * UserRepository と AuthRepository を組み合わせて使う
 * ビジネスロジック層
 */
class UnifiedAuthService {
  // ===== ローカル認証 =====

  // メール/パスワードでユーザー登録
  async registerLocal(email, password, username) {
    console.log(`[UnifiedAuthService] Registering local user: ${email}`);

    // 1. ユーザー作成
    const user = UserRepository.create({
      username: username,
      email: email,
      avatarUrl: null
    });

    // 2. 認証情報作成
    await AuthRepository.createLocal(user.id, email, password);

    console.log(`[UnifiedAuthService] Local user registered: ${user.id}`);
    return this.getUserWithAuths(user.id);
  }

  // メール/パスワードでログイン
  async loginLocal(email, password) {
    console.log(`[UnifiedAuthService] Local login attempt: ${email}`);
    
    // 認証情報で検証
    const userId = await AuthRepository.verifyLocalPassword(email, password);

    if (!userId) {
      return null;
    }

    // ユーザー情報を取得
    const user = UserRepository.findById(userId);

    if (!user) {
      console.error(`[UnifiedAuthService] User not found: ${userId}`);
      return null;
    }

    // 最終ログイン日時を更新
    UserRepository.updateLastLogin(userId);

    return this.getUserWithAuths(userId);
  }

  // ===== OAuth認証 =====

  // OAuthでログインまたは登録
  async loginOrRegisterOAuth(provider, oauthUserInfo) {
    console.log(`[UnifiedAuthService] OAuth login/register: ${provider}`);

    // 既存の認証情報を検索
    let userId = AuthRepository.findUserByOAuth(
      provider,
      oauthUserInfo.providerId
    );

    if (userId) {
      // 既存ユーザー
      console.log(`[UnifiedAuthService] Existing user found: ${userId}`);

      const user = UserRepository.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // 最終ログイン日時を更新
      UserRepository.updateLastLogin(userId);

      return this.getUserWithAuths(userId);
    }

    // 新規ユーザー作成
    console.log(`[UnifiedAuthService] Creating new user for OAuth`);

    // 1. ユーザー作成
    const user = UserRepository.create({
      username: oauthUserInfo.username,
      email: oauthUserInfo.email,
      avatarUrl: oauthUserInfo.avatarUrl
    });

    // 2. OAuth認証情報作成
    AuthRepository.createOAuth(
      user.id,
      provider,
      oauthUserInfo.providerId,
      oauthUserInfo.email
    );

    console.log(`[UnifiedAuthService] OAuth user registered: ${user.id}`);
    return this.getUserWithAuths(user.id);
  }

  // ===== ユーザー情報取得 =====
  
  // ユーザー情報 + 認証方法を取得
  getUserWithAuths(userId) {
    const user = UserRepository.findById(userId);

    if (!user) {
      return null;
    }

    const auths = AuthRepository.findAuthsByUserId(userId);

    return {
      ...user,
      linkedProviders: auths
    };
  }

  // ===== プリファレンス/プロフィール更新 =====

  updatePreferences(userId, preferences) {
    return UserRepository.updatePreferences(userId, preferences);
  }

  updateProfile(userId, profile) {
    return UserRepository.updateProfile(userId, profile);
  }
}

export default new UnifiedAuthService();