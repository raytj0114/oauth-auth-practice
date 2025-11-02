import SessionManager from "../auth/SessionManager.js";

export function requireAuth(req, res, next) {
  const sessionId = req.cookies.sessionId;

  console.log('[Auth Middleware] Checking authentication...');

  if (!sessionId) {
    console.log('[Auth Middleware] No session ID found');
    return res.status(401).send(`
      <h1>401 - Not authenticated</h1>
      <p>Please <a href="/">login</a> first.</p>
    `);
  }

  const session = SessionManager.get(sessionId);

  if (!session) {
    console.log('[Auth Middleware] Invalid session');
    res.clearCookie('sessionId');
    return res.status(401).send(`
      <h1>401 - Session expired</h1>
      <p>Your session has expired. Please <a href="/">login</a> again.</p>
    `);
  }

  // ユーザー情報をリクエストに追加
  req.user = session.userData;
  console.log(`[Auth Middleware] Authenticated as ${req.user.username}`);

  next();
}