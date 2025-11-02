import crypto from 'crypto';
import SessionManager from './SessionManager.js';

class AuthManager {
  constructor() {
    this.providers = {};
    this.pendingStates = new Map(); // CSRF対策用
  }

  // プロバイダー登録
  registerProvider(name, provider) {
    this.providers[name] = provider;
    console.log(`[AuthManager] Registered provider: ${name}`);
  }

  // State生成(CSRF対策用)
  generateState() {
    return crypto.randomBytes(16).toString('hex');
  }

  // 認証開始
  startAuthentication(providerName) {
    console.log(`[AuthManager] Starting authentication with ${providerName}`);

    const provider = this.providers[providerName];
    if(!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    // Stateを生成して記録
    const state = this.generateState();
    this.pendingStates.set(state, {
      provider: providerName,
      createdAt: Date.now()
    });

    // 古いstateをクリーンアップ(5分以上前)
    this.cleanupOldStates();

    return provider.getAuthorizationUrl(state);
  }

  // 認証完了処理(コールバック)
  async handleCallback(providerName, code, state) {
    console.log(`[AuthManager] Handling callback from ${providerName}`);

    // State認証(CSRF対策)
    if (!this.pendingStates.has(state)) {
      console.error('[AuthManager] Invalid state parameter');
      throw new Error('Invalid state parameter');
    }

    this.pendingStates.delete(state);

    const provider = this.providers[providerName];
    if(!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    // OAuth フロー実行
    const accessToken = await provider.exchangeCodeForToken(code);
    const userInfo = await provider.getUserInfo(accessToken);

    // セッション生成
    const sessionId = SessionManager.create(userInfo.providerId, userInfo);

    console.log(`[AuthManager] Authentication successful for ${userInfo.userName}`);

    return { sessionId, userInfo };
  }

  // 古いstateのクリーンアップ
  cleanupOldStates() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    for (const [state, data] of this.pendingStates) {
      if (data.createdAt < fiveMinutesAgo) {
        this.pendingStates.delete(state);
      }
    }
  }
}

export default new AuthManager();