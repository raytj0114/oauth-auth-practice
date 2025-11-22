import SessionManager from '../auth/SessionManager.js';

/**
 * 全てのビューで使える変数とヘルパー関数を設定
 */
export async function viewHelpers(req, res, next) {
  // ユーザー情報をビューに渡す
  res.locals.user = null;

  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    const session = await SessionManager.get(sessionId);
    if (session) {
      res.locals.user = session.userData;
    }
  }

  // ヘルパー関数
  res.locals.formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  res.locals.formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  res.locals.currentYear = new Date().getFullYear();

  // 現在のパス
  res.locals.currentPath = req.path;

  // 環境
  res.locals.NODE_ENV = process.env.NODE_ENV || 'development';

  next();
}