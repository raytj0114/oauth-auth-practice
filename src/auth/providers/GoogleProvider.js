class GoogleProvider {
  constructor(config) {
    // 環境変数から設定を受け取る
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;

    // Google OAuth のURL
    this.authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    this.tokenUrl = 'https://oauth2.googleapis.com/token';
    this.userUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
    this.scope = 'openid email profile';
  }

  // ステップ1: 認可URLの生成
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scope,
      state: state,
      prompt: 'select_account'
    });

    const url = `${this.authUrl}?${params.toString()}`;
    console.log('[Google] Authorization URL:', url);

    return url;
  }

  // ステップ2: 認可コードをアクセストークンに交換
  async exchangeCodeForToken(code) {
    console.log('[Google] Exchanging code for token...');

    // Google は application/x-www-form-urlencoded 形式を要求
    const params = new URLSearchParams({
      code: code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code'
    });

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Google] Token exchange failed:', error);
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    console.log('[Google] Token received:', data.access_token ? '✓' : '×');

    return data.access_token;
  }

  // ステップ3: アクセストークンでユーザー情報取得
  async getUserInfo(accessToken) {
    console.log('[Google] Fetching user info...');

    const response = await fetch(this.userUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      console.error('[Google] Failed to fetch user info');
      throw new Error('Failed to fetch user info');
    }

    const user = await response.json();
    console.log('[Google] User info received:', user.email);

    // 正規化されたユーザー情報を返す
    return {
      provider: 'google',
      providerId: user.id,
      username: user.name,
      email: user.email,
      avatarUrl: user.picture,
      raw: user
    };
  }
}

export default GoogleProvider;