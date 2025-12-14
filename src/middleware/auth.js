import SessionManager from '../auth/SessionManager.js';

/**
 * 認証が必要なルートを保護するミドルウェア
 */
export async function requireAuth(req, res, next) {
  console.log('[Auth Middleware] Checking authentication...');

  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    console.log('[Auth Middleware] No session ID found');
    return res.redirect('/local/signin');
  }

  try {
    const session = await SessionManager.get(sessionId);

    if (!session) {
      console.log('[Auth Middleware] Session not found or expired');
      res.clearCookie('sessionId');
      return res.redirect('/local/signin');
    }

    console.log('[Auth Middleware] Session valid for user:', session.userData.username);

    // ユーザー情報をリクエストに追加
    req.user = session.userData;
    console.log(`[Auth Middleware] Authenticated as ${req.user.username}`);

    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    return res.status(500).send('Authentication error');
  }
}
