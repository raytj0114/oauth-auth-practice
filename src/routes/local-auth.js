import express from 'express';
import UnifiedAuthService from '../auth/UnifiedAuthService.js';
import SessionManager from '../auth/SessionManager.js';

const router = express.Router();

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
    error: req.query.error || null
  });
});

// ===== サインアップ処理 =====
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    console.log(`\n=== Sign Up Attempt ===`);
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);

    // 入力チェック
    if (!username || !email || !password) {
      throw new Error('All fields are required');
    }

    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // ユーザー登録
    const user = await UnifiedAuthService.registerLocal(email, password, username);

    // 新しいセッション作成
    const sessionId = await SessionManager.create(user.id, user);

    // Cookieセット
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseInt(process.env.SESSION_MAX_AGE)
    });

    console.log(`[SignUp] User registered and logged in: ${user.username}`);
    console.log(`=== Sign Up Complete ===\n`);

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
    error: req.query.error || null
  });
});

// ===== サインイン処理 =====
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`\n=== Sign In Attempt ===`);
    console.log(`Email: ${email}`);

    // 入力チェック
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // ログイン
    const user = await UnifiedAuthService.loginLocal(email, password);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // 新しいセッション作成
    const sessionId = await SessionManager.create(user.id, user);

    // Cookieセット
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseInt(process.env.SESSION_MAX_AGE)
    });

    console.log(`[SignIn] User logged in: ${user.username}`);
    console.log(`=== Sign In Complete ===\n`);

    res.redirect('/profile');
  } catch (error) {
    console.error('Signin error:', error);
    res.redirect(`/local/signin?error=${encodeURIComponent(error.message)}`);
  }
});

export default router;