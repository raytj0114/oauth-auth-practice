import express from 'express';
import UserStore from '../auth/UserStore.js';
import SessionManager from '../auth/SessionManager.js';
import { Session } from 'inspector';

const router = express.Router();

// ===== サインアップページ表示 =====
router.get('/signup', (req, res) => {
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
          body{
            font-family: sans-serif;
            max-width: 400px;
            margin: 50px auto;
            padding: 20px;
          }
          .form-group {
            margin-bottom: 15px;
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
            background: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
          }
          button:hover {
            background: #218838;
          }
          .error {
            color: red;
            margin-bottom: 15px;
          }
          .link {
            text-align: center;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <h1>Sign Up</h1>
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
            <input type="password" name="password" minlength="6" required />
          </div>
          <button type="submit">Sign Up</button>
        </form>
        <div class="link">
          Already have an account? <a href="/local/signin">Sign In</a>
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

    // ユーザー作成
    const user = await UserStore.create(email, password, username);

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
    console.log(`=== Sign Up Complete ====\n`);

    res.redirect('/profile');
  } catch (error) {
    console.error('Sign up error:', error.message);
    res.status(400).send(`
      <h1>Sign Up Failed</h1>
      <p>${error.message}</p>
      <a href="/local/signup">Try Again</a>
    `);
  }
});

// ===== サインインページ表示 =====
router.get('/signin', (req, res) => {
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
          body{
            font-family: sans-serif;
            max-width: 400px;
            margin: 50px auto;
            padding: 20px;
          }
          .form-group {
            margin-bottom: 15px;
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
            font-size: 16px;
            cursor: pointer;
          }
          button:hover {
            background: #0256c4;
          }
          .link {
            text-align: center;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        <h1>Sign In</h1>
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
        <div class="link">
          Don't have an account? <a href="/local/signup">Sign Up</a>
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

    // パスワード検証
    const user = await UserStore.verifyPassword(email, password);

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
    console.error('Sign in error:', error.message);
    res.status(401).send(`
      <h1>Sign In Failed</h1>
      <p>${error.message}</p>
      <a href="/local/signin">Try Again</a>
    `);
  }
});

export default router;