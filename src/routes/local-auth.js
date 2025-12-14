import express from 'express';
import UnifiedAuthService from '../auth/UnifiedAuthService.js';
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
    path: '/', // 全てのパスで有効
  };
}

/**
 * 入力のサニタイズ
 * XSS対策として基本的なサニタイズを行う
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 255); // 長さ制限
}

/**
 * メールアドレスのバリデーション
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * パスワードのバリデーション
 */
function validatePassword(password) {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password is too long' };
  }
  return { valid: true };
}

/**
 * ユーザー名のバリデーション
 */
function validateUsername(username) {
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' };
  }
  if (username.length > 50) {
    return { valid: false, message: 'Username is too long' };
  }
  // 英数字、アンダースコア、ハイフンのみ許可
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      message: 'Username can only contain letters, numbers, underscores, and hyphens',
    };
  }
  return { valid: true };
}

// ===== サインアップページ表示 =====
router.get('/signup', async (req, res) => {
  // 既にログイン中か確認
  const sessionId = req.cookies.sessionId;
  const session = sessionId ? await SessionManager.get(sessionId) : null;

  if (session) {
    console.log('[SignUp] User already authenticated, redirecting to profile');
    return res.redirect('/profile');
  }

  res.render('auth/signup', {
    title: 'Sign Up',
    error: req.query.error || null,
  });
});

// ===== サインアップ処理 =====
router.post('/signup', async (req, res) => {
  try {
    // 入力をサニタイズ
    const username = sanitizeInput(req.body.username);
    const email = sanitizeInput(req.body.email).toLowerCase();
    const password = req.body.password || ''; // パスワードはトリミングしない

    console.log('\n=== Sign Up Attempt ===');
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);

    // 入力チェック
    if (!username || !email || !password) {
      throw new Error('All fields are required');
    }

    // ユーザー名バリデーション
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      throw new Error(usernameValidation.message);
    }

    // メールバリデーション
    if (!isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    // パスワードバリデーション
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // ユーザー登録
    const user = await UnifiedAuthService.registerLocal(email, password, username);

    // 新しいセッション作成
    const sessionId = await SessionManager.create(user.id, user);

    // Cookieセット(強化された設定)
    res.cookie('sessionId', sessionId, getCookieOptions());

    console.log(`[SignUp] User registered and logged in: ${user.username}`);
    console.log('=== Sign Up Complete ===\n');

    res.redirect('/profile');
  } catch (error) {
    console.error('Signup error:', error);

    // エラーメッセージを分かりやすく
    let errorMessage = error.message;

    if (error.message.includes('already registered') || error.message.includes('already exists')) {
      errorMessage = 'This email is already registered. Please sign in instead.';
    } else if (error.message.includes('duplicate key')) {
      errorMessage = 'This email is already registered.';
    }

    res.redirect(`/local/signup?error=${encodeURIComponent(errorMessage)}`);
  }
});

// ===== サインインページ表示 =====
router.get('/signin', async (req, res) => {
  // 既にログイン中か確認
  const sessionId = req.cookies.sessionId;
  const session = sessionId ? await SessionManager.get(sessionId) : null;

  if (session) {
    console.log('[SignIn] User already authenticated, redirecting to profile');
    return res.redirect('/profile');
  }

  res.render('auth/signin', {
    title: 'Sign In',
    error: req.query.error || null,
  });
});

// ===== サインイン処理 =====
router.post('/signin', async (req, res) => {
  try {
    // 入力をサニタイズ
    const email = sanitizeInput(req.body.email).toLowerCase();
    const password = req.body.password || '';

    console.log('\n=== Sign In Attempt ===');
    console.log(`Email: ${email}`);

    // 入力チェック
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // メールバリデーション
    if (!isValidEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    // ログイン
    const user = await UnifiedAuthService.loginLocal(email, password);

    if (!user) {
      // セキュリティ: 具体的な理由を明かさない
      throw new Error('Invalid email or password');
    }

    // 新しいセッション作成
    const sessionId = await SessionManager.create(user.id, user);

    // Cookieセット(強化された設定)
    res.cookie('sessionId', sessionId, getCookieOptions());

    console.log(`[SignIn] User logged in: ${user.username}`);
    console.log('=== Sign In Complete ===\n');

    res.redirect('/profile');
  } catch (error) {
    console.error('Signin error:', error);

    // セキュリティ: 具体的なエラー内容を隠す(ユーザー列挙攻撃対策)
    const safeErrorMessage =
      error.message === 'Invalid email or password' ? error.message : 'Invalid email or password';

    res.redirect(`/local/signin?error=${encodeURIComponent(safeErrorMessage)}`);
  }
});

export default router;
