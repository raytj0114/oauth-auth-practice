import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import DatabaseConnection from './src/database/connection.js';
import UnifiedAuthService from './src/auth/UnifiedAuthService.js';
import SessionManager from './src/auth/SessionManager.js';
import AuthManager from './src/auth/AuthManager.js';
import GitHubProvider from './src/auth/providers/GitHubProvider.js';
import GoogleProvider from './src/auth/providers/GoogleProvider.js';
import RepositoryFactory from './src/auth/stores/RepositoryFactory.js';
import authRoutes from './src/routes/auth.js';
import localAuthRoutes from './src/routes/local-auth.js';
import protectedRoutes from './src/routes/protected.js';

dotenv.config();

const app = express();

// 環境変数から設定を取得
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const USE_DATABASE = process.env.USE_DATABASE === 'true';

if (USE_DATABASE) {
  console.log('[App] Using PostgreSQL database');
  DatabaseConnection.initialize();

  // 接続テスト
  await DatabaseConnection.testConnection()
    .then(success => {
      if (!success) {
        console.log('[App] Database connection failed. Exiting...');
        process.exit(1);
      }
    });
} else {
  console.log('[App] Using in-memory storage');
}

// UnifiedAuthService 初期化
await UnifiedAuthService.initialize();

// SessionManager 初期化
await SessionManager.initialize();

// ミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// リクエストログ
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// OAuth プロバイダー登録(環境変数から設定を渡す)
AuthManager.registerProvider('github', new GitHubProvider({
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  redirectUri: process.env.GITHUB_REDIRECT_URI
}));

AuthManager.registerProvider('google', new GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI
}));

// ルート
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <title>OAuth Practice</title>
      <style>
        body {
          font-family: sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          text-align: center;
        }
        h1 {
          color: #333;
        }
        .section {
          margin: 30px 0;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
        }
        .section h2 {
          margin-top: 0;
          font-size: 20px;
        }
        .btn {
          display: block;
          margin: 10px 0;
          padding: 12px;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-size: 16px;
          transition: opacity 0.3s;
        }
        .btn:hover {
          opacity: 0.8;
        }
        .btn-github {
          background: #0366d6;
        }
        .btn-google {
          background: #db4437;
        }
        .btn-signup {
          background: #28a745;
        }
        .btn-signin {
          background: #007bff;
        }
        .btn-profile {
          background: #6c757d;
        }
        .env-badge {
          display: inline-block;
          padding: 5px 10px;
          background: ${NODE_ENV === 'production' ? '#28a745' : '#ffc107'};
          color: ${NODE_ENV ===  'production' ? 'white' : '#black'}
          border-radius: 3px;
          font-size: 12px;
          margin-top: 10px;
        }
      </style>
      <body>
        <h1>🔐 OAuth 2.0 Practice</h1>
        <p>GitHub OAuth 認証のデモアプリケーション</p>
        <div class="env-badge">Environment: ${NODE_ENV}</div>

        <div class="section">
          <h2>🌐 OAuth Login</h2>
          <a href="/auth/github" class="btn btn-github">
            🐙 Login with GitHub
          </a>
          <a href="/auth/google" class="btn btn-google">
            🔴 Login with Google
          </a>
        </div>

        <div class="section">
          <h2>📧 Email/Password Login</h2>
          <a href="/local/signup" class="btn btn-signup">
            ✨ Sign Up (Create Account)
          </a>
          <a href="/local/signin" class="btn btn-signin">
            🔑 Sign In (Existing Account)
          </a>
        </div>
        
        <hr style="margin 30px 0;">

        <a href="/profile" class="btn btn-profile">
          👤 View Profile (Protected)
        </a>
      </body>
      </html>
    `);
});

app.use('/auth', authRoutes);
app.use('/local', localAuthRoutes);
app.use('/', protectedRoutes);

// サーバー起動
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${NODE_ENV}`);
  console.log(`💾 Storage: ${USE_DATABASE ? 'PostgreSQL' : 'Memory'}`);
  console.log(`${'='.repeat(50)}\n`);
});

// プロセス終了時にプールをクローズ
process.on('SIGTERM', async () => {
  console.log('[App] SIGTERM received, closing database connection...');
  if (USE_DATABASE) {
    await DatabaseConnection.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[App] SIGINT received, closing database connection...');
  if (USE_DATABASE) {
    await DatabaseConnection.close();
  }
  process.exit(0);
});

if (NODE_ENV === 'development') {
  // ストレージ状態の確認
  app.get('/debug', async (req, res) => {
    try {
      const storageType = RepositoryFactory.getStorageType();

      if (USE_DATABASE) {
        // PostgreSQL: テーブル情報
        const tables = await DatabaseConnection.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
        `);

        const userCount = await DatabaseConnection.query(
          'SELECT COUNT(*) as count FROM users'
        );

        const authCount = await DatabaseConnection.query(
          'SELECT COUNT(*) as count FROM authentications'
        );

        const sessionCount = await DatabaseConnection.query(
          'SELECT COUNT(*) as count FROM sessions'
        );

        res.json({
          storage: storageType,
          database: {
            connected: true,
            tables: tables.rows.map(r => r.table_name),
            counts: {
              users: userCount.rows[0].count,
              authentications: authCount.rows[0].count,
              sessions: sessionCount.rows[0].count
            }
          }
        });
      } else {
        // メモリ: Repository の debug() を使用
        const userRepo = await RepositoryFactory.getUserRepository();
        const authRepo = await RepositoryFactory.getAuthRepository();
        const sessionRepo = await RepositoryFactory.getSessionRepository();

        // コンソールに出力
        console.log('\n===== DEBUG INFO =====');
        userRepo.debug();
        authRepo.debug();
        await sessionRepo.debug();
        console.log('======================\n');

        res.json({
          storage: storageType,
          message: 'Debug info logged to console'
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // データベースのリセット(PostgreSQL のみ)
  app.post('/debug/reset', async (req, res) => {
    if (!USE_DATABASE) {
      return res.status(400).json({ error: 'Only available for database mode' });
    }

    try {
      await DatabaseConnection.query('TRUNCATE users RESTART IDENTITY CASCADE');
      await DatabaseConnection.query('TRUNCATE authentications RESTART IDENTITY CASCADE');
      await DatabaseConnection.query('TRUNCATE sessions RESTART IDENTITY CASCADE');

      console.log('[Debug] Database reset completed');

      res.json({
        success: true,
        message: 'Database reset completed'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // サンプルデータの作成(テスト用)
  app.post('/debug/seed', async (req, res) => {
    try {
      await UnifiedAuthService.ensureInitialized();

      // サンプルユーザー1: ローカル認証
      const user1 = await UnifiedAuthService.registerLocal(
        'alice@example.com',
        'password123',
        'alice'
      );

      // サンプルユーザー2: ローカル認証
      const user2 = await UnifiedAuthService.registerLocal(
        'bob@example.com',
        'password456',
        'bob'
      );

      console.log('[Debug] Sample data created');

      res.json({
        success: true,
        users: [user1, user2]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}