import { doubleCsrf } from 'csrf-csrf';
import crypto from 'crypto';

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * CSRF シークレットを取得または生成
 * 本番環境では環境変数から取得することを推奨
 */
function getCsrfSecret() {
  if (process.env.CSRF_SECRET) {
    return process.env.CSRF_SECRET;
  }

  // 開発環境用のデフォルトシークレット
  if (NODE_ENV === 'development') {
    console.warn('[CSRF] Using default secret for development. Set CSRF_SECRET in production.');
    return 'development-csrf-secret-do-not-use-in-production';
  }

  // 本番環境でシークレットが設定されていない場合は警告
  console.error('[CSRF] CSRF_SECRET is not set! Generating random secret (will change on restart)');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * csrf-csrf の設定
 * Double Submit Cookie パターンを使用
 */
const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => getCsrfSecret(),
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
    path: '/',
  },
  // トークンをどこから取得するか
  getTokenFromRequest: (req) => {
    // 1. リクエストボディから取得（フォーム送信）
    if (req.body && req.body._csrf) {
      return req.body._csrf;
    }
    // 2. ヘッダーから取得（AJAX リクエスト）
    if (req.headers['x-csrf-token']) {
      return req.headers['x-csrf-token'];
    }
    return null;
  },
});

/**
 * CSRF トークンを生成してレスポンスローカルに設定するミドルウェア
 * 全てのGETリクエストでトークンを生成
 */
function csrfTokenMiddleware(req, res, next) {
  // トークンを生成
  const token = generateToken(req, res);

  // テンプレートで使用できるように設定
  res.locals.csrfToken = token;

  next();
}

/**
 * CSRF エラーハンドラー
 */
function csrfErrorHandler(err, req, res, next) {
  if (err.code === 'EBADCSRFTOKEN' || err.message === 'invalid csrf token') {
    console.error('[CSRF] Invalid CSRF token:', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    return res.status(403).render('error', {
      ...res.locals, // res.localsの全プロパティを展開
      title: 'Forbidden',
      errorCode: 403,
      message: 'Invalid or missing security token. Please refresh the page and try again.',
    });
  }

  next(err);
}

export { generateToken, doubleCsrfProtection, csrfTokenMiddleware, csrfErrorHandler };
