import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
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
import { 
  doubleCsrfProtection, 
  csrfTokenMiddleware, 
  csrfErrorHandler 
} from './src/middleware/csrf.js';

dotenv.config();

// ESM で __dirname を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 環境変数から設定を取得
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const USE_DATABASE = process.env.USE_DATABASE === 'true';

// ===== セキュリティミドルウェア =====

// Helmet: セキュリティヘッダーを設定
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://avatars.githubusercontent.com", "https://lh3.googleusercontent.com"],
    },
  },
  // COEP を無効化: 外部画像（GitHub/Google アバター）の読み込みを許可
  crossOriginEmbedderPolicy: false,
  // CORP ヘッダーも調整
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// レート制限: 全体のリクエスト制限
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 100リクエスト/15分
  standardHeaders: true,
  legacyHeaders: false,
  // 開発環境ではスキップ
  skip: () => NODE_ENV === 'development',
  // カスタムエラーハンドラー: EJS テンプレートを使用
  handler: (req, res) => {
    res.status(429).render('error', {
      ...res.locals,
      title: 'Too Many Requests',
      errorCode: 429,
      message: 'Too many requests from this IP. Please try again later.'
    });
  },
});

// レート制限: 認証関連の厳しい制限
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 10, // 10回まで/15分
  standardHeaders: true,
  legacyHeaders: false,
  // 開発環境ではスキップ
  skip: () => NODE_ENV === 'development',
  // カスタムエラーハンドラー: EJS テンプレートを使用
  handler: (req, res) => {
    res.status(429).render('error', {
      ...res.locals,
      title: 'Too Many Attempts',
      errorCode: 429,
      message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
    });
  },
});

// 全体のレート制限を適用
app.use(generalLimiter);

// ===== View Engine 設定 =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 本番環境ではテンプレートキャッシュを有効化
if (NODE_ENV === 'production') {
  app.set('view cache', true);
}

// ===== 静的ファイル =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== ミドルウェア =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== ビューヘルパー =====
app.use(viewHelpers);

// ===== CSRF 保護 =====
// 注意: cookieParser と urlencoded の後に配置する必要がある
app.use(csrfTokenMiddleware); // 全リクエストでトークンを生成

// CSRF 保護が不要なルート（OAuth コールバック、ヘルスチェック）
const csrfExcludedPaths = [
  '/health',
  '/auth/github/callback',
  '/auth/google/callback',
];

// CSRF 検証ミドルウェア（POST リクエストのみ、除外パス以外）
app.use((req, res, next) => {
  // GET, HEAD, OPTIONS は検証しない
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // 除外パスは検証しない
  if (csrfExcludedPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // CSRF 検証を実行
  doubleCsrfProtection(req, res, next);
});

// ===== リクエストログ =====
if (NODE_ENV === 'production') {
  // 本番環境: 簡潔なログ
  app.use(morgan('combined'));
} else {
  // 開発環境: 詳細なログ
  app.use(morgan('dev'));
}

// ===== Trust Proxy (Heroku, Railway などのリバースプロキシ対応) =====
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ===== Health Check エンドポイント =====
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    storage: RepositoryFactory.getStorageType()
  });
});

// ===== データベース初期化 =====
if (USE_DATABASE) {
  console.log('[App] Using PostgreSQL database');
  DatabaseConnection.initialize();

  // 接続テスト
  const connectionSuccess = await DatabaseConnection.testConnection();
  if (!connectionSuccess) {
    console.error('[App] Database connection failed. Exiting...');
    process.exit(1);
  }
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

// ===== 認証関連ルートにレート制限を適用 =====
app.use('/local/signin', authLimiter);
app.use('/local/signup', authLimiter);
app.use('/auth', authLimiter);

// ===== Routes =====
app.use('/auth', authRoutes);
app.use('/local', localAuthRoutes);
app.use('/', protectedRoutes);

// ===== Home ページ =====
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

// ===== 404 エラーハンドリング =====
app.use((req, res) => {
  res.status(404).render('error', {
    ...res.locals,
    title: 'Page Not Found',
    errorCode: 404,
    message: 'The page you are looking for does not exist.'
  });
});

// ===== CSRF エラーハンドリング =====
app.use(csrfErrorHandler);

// ===== グローバルエラーハンドリング =====
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // 本番環境ではエラー詳細を隠す
  const errorMessage = NODE_ENV === 'development' 
    ? err.message 
    : 'An unexpected error occurred. Please try again later.';
  
  res.status(500).render('error', {
    ...res.locals,
    title: 'Server Error',
    errorCode: 500,
    message: errorMessage
  });
});

// ===== サーバー起動 =====
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${NODE_ENV}`);
  console.log(`💾 Storage: ${RepositoryFactory.getStorageType()}`);
  console.log(`🔒 Security: helmet, rate-limit, CSRF enabled`);
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