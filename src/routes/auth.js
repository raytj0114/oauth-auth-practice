import express from 'express';
import AuthManager from '../auth/AuthManager.js';
import SessionManager from '../auth/SessionManager.js';

const router = express.Router();

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Cookie の設定を生成
 * セキュリティを考慮した設定
 */
function getCookieOptions() {
  const maxAge = parseInt(process.env.SESSION_MAX_AGE);
  
  return {
    httpOnly: true, // JavaScriptからアクセス不可
    secure: NODE_ENV === 'production', // 本番環境ではHTTPSのみ
    sameSite: 'lax', // CSRF対策: 同一サイトからのリクエストのみ
    maxAge: isNaN(maxAge) ? 86400000 : maxAge, // デフォルト24時間
    path: '/' // 全てのパスで有効
  };
}

// 認証開始エンドポイント
router.get('/:provider', async (req, res) => {
  try {
    // 既にログイン中か確認
    const sessionId = req.cookies.sessionId;
    const session = sessionId ? await SessionManager.get(sessionId) : null;

    if (session) {
      console.log('[Auth] User already authenticated, redirecting to profile');
      return res.redirect('/profile');
    }

    // ログインしていなければ認証開始
    const { provider } = req.params;
    
    // サポートされているプロバイダーか確認
    const supportedProviders = ['github', 'google'];
    if (!supportedProviders.includes(provider)) {
      console.log(`[Auth] Unsupported provider: ${provider}`);
      return res.redirect('/?error=Unsupported authentication provider');
    }

    console.log('\n=== Authentication Flow Started ===');
    console.log(`Provider: ${provider}`);

    const authUrl = AuthManager.startAuthentication(provider);

    console.log(`Redirecting to: ${authUrl}`);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Auth start error:', error);
    res.redirect('/?error=Authentication failed to start');
  }
});

// コールバックエンドポイント
router.get('/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query;

    console.log('\n=== Callback Received ===');
    console.log(`Provider: ${provider}`);
    console.log(`Code: ${code ? '✓' : '×'}`);
    console.log(`State: ${state}`);

    // OAuthプロバイダーからのエラー
    if (oauthError) {
      console.log(`[Auth] OAuth error: ${oauthError}`);
      return res.redirect(`/?error=${encodeURIComponent('Authentication was cancelled or denied')}`);
    }

    if (!code || !state) {
      console.log('[Auth] Missing code or state');
      return res.redirect('/?error=Invalid authentication response');
    }

    // 認証処理
    const { sessionId, _userInfo } = await AuthManager.handleCallback(
      provider,
      code,
      state
    );

    // セッションIDをCookieにセット(強化された設定)
    res.cookie('sessionId', sessionId, getCookieOptions());

    console.log(`Session created: ${sessionId}`);
    console.log('=== Authentication Complete ===\n');

    res.redirect('/profile');
  } catch (error) {
    console.error('Callback error:', error);
    
    // 本番環境ではエラー詳細を隠す
    const errorMessage = NODE_ENV === 'development' 
      ? error.message 
      : 'Authentication failed';
    
    res.redirect(`/?error=${encodeURIComponent(errorMessage)}`);
  }
});

// ログアウト
router.post('/logout', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    try {
      await SessionManager.destroy(sessionId);
      console.log(`[Auth] Session destroyed: ${sessionId}`);
    } catch (error) {
      console.error('[Auth] Session destroy error:', error);
    }
    
    // Cookieをクリア(同じオプションで)
    res.clearCookie('sessionId', {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
  }
  res.redirect('/');
});

export default router;