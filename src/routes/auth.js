import express from 'express';
import AuthManager from '../auth/AuthManager.js';
import SessionManager from '../auth/SessionManager.js';

const router = express.Router();

// 認証開始エンドポイント
router.get('/:provider', (req, res) => {
  try {
    // 既にログイン中か確認
    const sessionId = req.cookies.sessionId;
    const session = sessionId ? SessionManager.get(sessionId) : null;

    if (session) {
      console.log('[Auth] User already authenticated, redirecting to profile');
      return res.redirect('/profile');
    }

    // ログインしていなければ認証開始
    const { provider } = req.params;
    console.log(`\n=== Authentication Flow Started ===`);
    console.log(`Provider: ${provider}`);

    const authUrl = AuthManager.startAuthentication(provider);

    console.log(`Redirecting to: ${authUrl}`);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Auth start error:', error);
    res.status(400).send('Invalid provider');
  }
});

// コールバックエンドポイント
router.get('/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;

    console.log(`\n=== Callback Received ===`);
    console.log(`Provider: ${provider}`);
    console.log(`Code: ${code ? '✓' : '×'}`);
    console.log(`State: ${state}`);

    if (!code || !state) {
      throw new Error('Missing code or state');
    }

    // 認証処理
    const { sessionId, userInfo } = await AuthManager.handleCallback(
      provider,
      code,
      state
    );

    // セッションIDをCookieにセット
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000
    });

    console.log(`Session created: ${sessionId}`);
    console.log(`=== Authentication Complete ===\n`);

    res.redirect('/profile');
  } catch (error) {
    console.log('Callback error:', error);
    res.status(400).send(`Authentication failed: ${error.message}`);
  }
});

// ログアウト
router.post('/logout', (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    SessionManager.destroy(sessionId);
    res.clearCookie('sessionId');
  }
  res.redirect('/');
});

export default router;