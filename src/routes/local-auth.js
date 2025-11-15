import express from 'express';
import UnifiedAuthService from '../auth/UnifiedAuthService.js';
import SessionManager from '../auth/SessionManager.js';

const router = express.Router();

// ===== サインアップページ表示 =====
router.get('/signup', (req, res) => {
  const error = req.query.error;

  // 既にログイン中か確認
  const sessionId = req.cookies.sessionId;
  const session = sessionId ? SessionManager.get(sessionId) : null;

  if (session) {
    console.log('[SignUp] User already authenticated, redirecting to profile');
    return res.redirect('/profile');
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sign Up</title>
        <style>
          body {
            font-family: sans-serif;
            max-width: 400px;
            margin: 100px auto;
            padding: 20px;
          }
          .form-group {
            margin: 15px 0;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
          }
          button {
            width: 100%;
            padding: 10px;
            background: #0366d6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          }
          button:hover {
            background: #0256c4;
          }
          .error {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
          }
          .links {
            margin-top: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>Sign Up</h1>
        
        ${error ? `<div class="error">${decodeURIComponent(error)}</div>` : ''}
        
        <form method="POST" action="/local/signup">
          <div class="form-group">
            <label>Username:</label>
            <input type="text" name="username" required />
          </div>
          
          <div class="form-group">
            <label>Email:</label>
            <input type="email" name="email" required />
          </div>
          
          <div class="form-group">
            <label>Password:</label>
            <input type="password" name="password" required minlength="6" />
          </div>
          
          <button type="submit">Sign Up</button>
        </form>
        
        <div class="links">
          <p>Already have an account? <a href="/local/signin">Sign In</a></p>
          <p><a href="/">← Back to Home</a></p>
      </div>
      </body>
    </html>
  `);
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

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // ユーザー登録
    const user = await UnifiedAuthService.registerLocal(email, password, username);

    // 既存セッションがあれば削除
    const existingSessionId = req.cookies.sessionId;
    if (existingSessionId) {
      console.log(`[SignUp] Removing old session: ${existingSessionId}`);
      SessionManager.destroy(existingSessionId);
    }

    // 新しいセッション作成
    const sessionId = SessionManager.create(user.id, user);

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
router.get('/signin', (req, res) => {
  const error = req.query.error;

  // 既にログイン中か確認
  const sessionId = req.cookies.sessionId;
  const session = sessionId ? SessionManager.get(sessionId) : null;

  if (session) {
    console.log('[SignIn] User already authenticated, redirecting to profile');
    return res.redirect('/profile');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sign In</title>
        <style>
          body {
            font-family: sans-serif;
            max-width: 400px;
            margin: 100px auto;
            padding: 20px;
          }
          .form-group {
            margin: 15px 0;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-sizing: border-box;
          }
          button {
            width: 100%;
            padding: 10px;
            background: #0366d6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          }
          button:hover {
            background: #0256c4;
          }
          .error {
            background: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
          }
          .links {
            margin-top: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>Sign In</h1>
        
        ${error ? `<div class="error">${decodeURIComponent(error)}</div>` : ''}
        
        <form method="POST" action="/local/signin">
          <div class="form-group">
            <label>Email:</label>
            <input type="email" name="email" required />
          </div>
          
          <div class="form-group">
            <label>Password:</label>
            <input type="password" name="password" required />
          </div>
          
          <button type="submit">Sign In</button>
        </form>
        
        <div class="links">
          <p>Don't have an account? <a href="/local/signup">Sign Up</a></p>
          <p><a href="/">← Back to Home</a></p>
      </div>
      </body>
    </html>
  `);
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

    // 既存セッションがあれば削除
    const existingSessionId = req.cookies.sessionId;
    if (existingSessionId) {
      console.log(`[SignIn] Removing old session: ${existingSessionId}`);
      SessionManager.destroy(existingSessionId);
    }

    // 新しいセッション作成
    const sessionId = SessionManager.create(user.id, user);

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