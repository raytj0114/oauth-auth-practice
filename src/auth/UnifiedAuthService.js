import RepositoryFactory from './stores/RepositoryFactory.js';

/**
 * RepositoryFactory経由でRepositoryを取得
 * ビジネスロジック層
 */
class UnifiedAuthService {
  constructor() {
    this.userRepository = null;
    this.authRepository = null;
    this.initialized = false;
  }

  /**
   * 初期化(Repositoryを取得)
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    this.userRepository = await RepositoryFactory.getUserRepository();
    this.authRepository = await RepositoryFactory.getAuthRepository();
    this.initialized = true;

    console.log(`[UnifiedAuthService] Initialized with ${RepositoryFactory.getStorageType()}`);
  }

  /**
   * 初期化済みか確認
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // ===== ローカル認証 =====

  // メール/パスワードでユーザー登録
  async registerLocal(email, password, username) {
    await this.ensureInitialized();

    console.log(`[UnifiedAuthService] Registering local user: ${email}`);

    // 1. ユーザー作成
    const user = await this.userRepository.create({
      username: username,
      email: email,
      avatarUrl: null
    });

    // 2. 認証情報作成
    await this.authRepository.createLocal(user.id, email, password);

    console.log(`[UnifiedAuthService] Local user registered: ${user.id}`);
    return this.getUserWithAuths(user.id);
  }

  // メール/パスワードでログイン
  async loginLocal(email, password) {
    await this.ensureInitialized();

    console.log(`[UnifiedAuthService] Local login attempt: ${email}`);
    
    // 認証情報で検証
    const userId = await this.authRepository.verifyLocalPassword(email, password);

    if (!userId) {
      return null;
    }

    // ユーザー情報を取得
    const user = await this.userRepository.findById(userId);

    if (!user) {
      console.error(`[UnifiedAuthService] User not found: ${userId}`);
      return null;
    }

    // 最終ログイン日時を更新
    await this.userRepository.updateLastLogin(userId);

    return this.getUserWithAuths(userId);
  }

  // ===== OAuth認証 =====

  // OAuthでログインまたは登録
  async loginOrRegisterOAuth(provider, oauthUserInfo) {
    await this.ensureInitialized();

    console.log(`[UnifiedAuthService] OAuth login/register: ${provider}`);

    // 既存の認証情報を検索
    let userId = await this.authRepository.findUserByOAuth(
      provider,
      oauthUserInfo.providerId
    );

    if (userId) {
      // 既存ユーザー
      console.log(`[UnifiedAuthService] Existing user found: ${userId}`);

      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // 最終ログイン日時を更新
      await this.userRepository.updateLastLogin(userId);

      return this.getUserWithAuths(userId);
    }

    // 新規ユーザー作成
    console.log(`[UnifiedAuthService] Creating new user for OAuth`);

    // 1. ユーザー作成
    const user = await this.userRepository.create({
      username: oauthUserInfo.username,
      email: oauthUserInfo.email,
      avatarUrl: oauthUserInfo.avatarUrl
    });

    // 2. OAuth認証情報作成
    await this.authRepository.createOAuth(
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
  async getUserWithAuths(userId) {
    await this.ensureInitialized();
    
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return null;
    }

    const auths = await this.authRepository.findAuthsByUserId(userId);

    return {
      ...user,
      linkedProviders: auths
    };
  }

  // ===== プリファレンス/プロフィール更新 =====

  async updatePreferences(userId, preferences) {
    await this.ensureInitialized();
    
    return await this.userRepository.updatePreferences(userId, preferences);
  }

  async updateProfile(userId, profile) {
    await this.ensureInitialized();
    
    return await this.userRepository.updateProfile(userId, profile);
  }
}

export default new UnifiedAuthService();