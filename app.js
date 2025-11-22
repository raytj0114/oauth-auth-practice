import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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
import { viewHelpers } from './src/middleware/viewHelpers.js';

dotenv.config();

// ESM で __dirname を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 環境変数から設定を取得
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const USE_DATABASE = process.env.USE_DATABASE === 'true';

// ===== View Engine 設定 =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== 静的ファイル =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== ミドルウェア =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(viewHelpers);

// リクエストログ
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// データベース初期化
if (USE_DATABASE) {
  console.log('[App] Using PostgreSQL database');
  DatabaseConnection.initialize();

  // 接続テスト
  await DatabaseConnection.testConnection()
    .then(success => {
      if (!success) {
        console.error('[App] Database connection failed. Exiting...');
        process.exit(1);
      }
    });
} else {
  console.log('[App] Using in-memory storage');
}

// サービス初期化
await UnifiedAuthService.initialize();
await SessionManager.initialize();

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

// ===== Routes =====
app.use('/auth', authRoutes);
app.use('/local', localAuthRoutes);
app.use('/', protectedRoutes);

// ===== Home ページ (暫定: 後でテンプレート化) =====
app.get('/', async (req, res) => {
  // セッションチェック
  let user = null;
  const sessionId = req.cookies.sessionId;
  
  if (sessionId) {
    const session = await SessionManager.get(sessionId);
    if (session) {
      user = session.userData;
    }
  }
  
  res.render('home', {
    title: 'OAuth Practice',
    user,
    error: req.query.error || null
  });
});

// ===== デバッグエンドポイント(開発環境のみ) =====
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

        // コンソールに出力
        console.log('\n===== DEBUG INFO =====');
        userRepo.debug();
        authRepo.debug();
        await SessionManager.debug();
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

// ===== エラーハンドリング =====
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    errorCode: 404,
    message: 'The page you are looking for does not exist.'
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render('error', {
    title: 'Server Error',
    errorCode: 500,
    message: NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ===== サーバー起動 =====
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${NODE_ENV}`);
  console.log(`💾 Storage: ${RepositoryFactory.getStorageType()}`);
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