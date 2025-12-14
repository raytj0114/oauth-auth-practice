class GitHubProvider {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.authUrl = 'https://github.com/login/oauth/authorize';
    this.tokenUrl = 'https://github.com/login/oauth/access_token';
    this.userUrl = 'https://api.github.com/user';
    this.scope = 'read:user user:email';
  }

  // ステップ1: 認可URLの生成
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state: state, // CSRF対策
    });

    const url = `${this.authUrl}?${params.toString()}`;
    console.log('[GitHub] Authorization URL:', url);

    return url;
  }

  // ステップ2: 認可コードをアクセストークンに交換
  async exchangeCodeForToken(code) {
    console.log('[Github] Exchanging code for token...');

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json', // JSONレスポンスを要求
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[GitHub] Token exchange failed:', error);
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    console.log('[Github] Token received:', data.access_token ? '✓' : '×');

    return data.access_token;
  }

  // ステップ3: アクセストークンでユーザー情報取得
  async getUserInfo(accessToken) {
    console.log('[GitHub] Fetching user info...');

    const response = await fetch(this.userUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[GitHub] Failed to fetch user info');
      throw new Error('Failed to fetch user info');
    }

    const user = await response.json();
    console.log('[GitHub] User info received:', user.login);

    // 正規化されたユーザー情報を返す
    return {
      provider: 'github',
      providerId: user.id.toString(),
      username: user.login,
      email: user.email,
      avatarUrl: user.avatar_url,
      raw: user, // 元データも保持
    };
  }
}

export default GitHubProvider;
