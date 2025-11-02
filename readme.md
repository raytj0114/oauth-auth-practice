## そもそも OAuth 認証とは何か?

### 生活での例え

**従来の方法(パスワード認証)**

```
あなた → レストランの会員証を作る
      → 名前とパスワードを登録
      → 次回来店時、パスワードで本人確認
```

**OAuth 認証**

```
あなた → 新しいレストランに行く
      → 「GitHubの会員証で本人確認してください」
      → レストランがGitHubに「この人は会員ですか?」と確認
      → GitHubが「はい、この人は会員です」と証明書を発行
      → レストランが「OK、入店どうぞ」
```

**なぜ OAuth を使うのか?**

- ユーザー: パスワードを何個も覚えなくていい
- アプリ: パスワードを管理しなくていい(漏洩リスクなし)
- GitHub: 自分のユーザーが安全に他サービスを使える

## 必要な要素の全体像

この機能には**6 つの登場人物**が必要です:

```
┌─────────────┐
│ 1. ブラウザ  │ ← ユーザーが操作する画面
└─────────────┘
      ↕
┌─────────────┐
│ 2. Express  │ ← あなたが作るWebサーバー
│   (サーバー) │
└─────────────┘
      ↕
┌─────────────┐
│ 3. GitHub   │ ← 認証を提供する外部サービス
└─────────────┘

サーバーの中には3つのパーツがある:
┌─────────────────────┐
│ 4. ルート(Routes)    │ ← 道案内係
│ 5. マネージャー      │ ← 管理人
│ 6. ストレージ        │ ← 記録係
└─────────────────────┘
```

それぞれ詳しく見ていきましょう。

## 1. ブラウザ(Browser)

**役割**: ユーザーが操作する窓口

**できること**:

- リンクをクリックする
- 情報を表示する
- Cookie を保存する(小さなメモ帳のようなもの)

**専門用語の説明**:

```javascript
// ブラウザが送るリクエスト(お願い)の例
GET /auth/github  ← 「GitHubログインページをください」
```

- `GET`: 「情報をください」という意味
- `/auth/github`: アドレス(住所のようなもの)

## 2. Express(サーバー)

**役割**: 24 時間動き続けるプログラム。リクエストを受け取って処理する

### 生活での例え

```
レストラン = Expressサーバー
お客さん   = ブラウザ

お客さん: 「メニューください」(GET /menu)
レストラン: メニューを渡す

お客さん: 「これを注文します」(POST /order)
レストラン: 注文を受け付ける
```

### コードの読み方

```javascript
const app = express();
// ↑ 変数appに、Expressサーバーを作って入れる
//
// 「const」= 変更できない変数(定数)
// 「=」= 右側の値を左側に入れる
// 「express()」= Express関数を実行して、サーバーを作る

app.use(cookieParser());
// ↑ サーバーに「Cookieを読む機能」を追加
//
// 「app.use()」= サーバーに機能を追加するコマンド
// 「cookieParser()」= Cookieを読み取る機能

app.get("/profile", (req, res) => {
  res.send("プロフィールページ");
});
// ↑ 「/profileにGETリクエストが来たら、この処理をする」という設定
//
// 「app.get()」= GETリクエストを受け取る設定
// 「'/profile'」= このアドレスに来たら
// 「(req, res) => {...}」= この処理を実行(後で説明)
```

### ミドルウェア(Middleware)とは?

**生活での例え**:

```
レストランに入る時の流れ:

お客さん → [予約確認] → [手の消毒] → [席案内] → 注文
          ミドル①      ミドル②      ミドル③
```

各ステップが「ミドルウェア」です。順番に実行されます。

```javascript
app.use(express.json()); // ① データを読める形に変換
app.use(cookieParser()); // ② Cookieを読める形に変換
app.use(ログミドルウェア); // ③ 記録を取る
app.get("/profile", ハンドラー); // ④ 最終的な処理
```

### req と res とは?

```javascript
app.get("/profile", (req, res) => {
  // req = request(リクエスト) = お客さんからの注文書
  // res = response(レスポンス) = お客さんへの返事

  console.log(req.url); // どのページを見たいか
  console.log(req.cookies); // Cookieの内容

  res.send("こんにちは"); // お客さんに返事を送る
});
```

### アロー関数 `=>` とは?

```javascript
// 古い書き方
function hello(name) {
  return "こんにちは " + name;
}

// 新しい書き方(アロー関数)
const hello = (name) => {
  return "こんにちは " + name;
};

// さらに短く
const hello = (name) => "こんにちは " + name;
```

`=>` は「この処理をしてください」という意味です。

## 3. GitHub(外部の認証サービス)

**役割**: 「この人は本物です」と証明してくれるサービス

**3 つの URL(窓口)**を持っています:

```javascript
// ① 認可URL: ユーザーに許可を求める画面
'https://github.com/login/oauth/authorize'
→ GitHubのログイン画面が表示される

// ② トークンURL: 「認可コード」を「アクセストークン」に交換
'https://github.com/login/oauth/access_token'
→ サーバー同士の通信(ユーザーは見えない)

// ③ ユーザー情報URL: ユーザーの情報を取得
'https://api.github.com/user'
→ サーバー同士の通信(ユーザーは見えない)
```

## 4. ルート(Routes) - 道案内係

**役割**: 「このアドレスに来たら、この処理をする」という道案内

### 生活での例え

```
デパートの案内板:

1階 → 食品売り場
2階 → 衣類売り場
3階 → 家電売り場

/          → トップページ
/auth/github → GitHubログイン開始
/profile   → プロフィールページ
```

### コード例

```javascript
// authRoutes.js (道案内の設定ファイル)

import express from "express";
// ↑ Expressを使えるようにする
// 「import」= 他のファイルから機能を持ってくる

const router = express.Router();
// ↑ 道案内用の機能を作る

// 道案内を設定
router.get("/:provider", (req, res) => {
  // /auth/github に来たら、この処理
  // :provider は「変数」→ 何でも入る
  // 例: /auth/github なら provider = 'github'
  //     /auth/google なら provider = 'google'

  const provider = req.params.provider; // 'github'
  console.log("ログイン開始:", provider);
});

export default router;
// ↑ この道案内設定を他のファイルで使えるようにする
```

### export と import の関係

```javascript
// ファイルA: 機能を作る側
export default router;
// ↑ 「この機能を外に出します」

// ファイルB: 機能を使う側
import authRoutes from "./authRoutes.js";
// ↑ 「ファイルAの機能を持ってきます」

app.use("/auth", authRoutes);
// ↑ 「/auth で始まるアドレスは、authRoutesに任せる」
```

## 5. マネージャー(AuthManager, SessionManager)

### AuthManager - 認証全体の管理人

**役割**: 認証の流れを指揮する司令塔

```javascript
class AuthManager {
  // ↑ 「class」= 設計図
  // ここから「AuthManager」という種類の管理人を作れる

  constructor() {
    // ↑ 「constructor」= 初期設定
    // 管理人が最初に持つべきものを準備

    this.providers = {};
    // ↑ 「this.」= 「この管理人の」という意味
    // 「{}」= 空の箱(オブジェクト)
    // providers = 認証サービスの一覧を入れる箱

    this.pendingStates = new Map();
    // ↑ 「Map」= キーと値のペアを保存する入れ物
    // pendingStates = 「進行中の認証」を記録
  }

  registerProvider(name, provider) {
    // ↑ メソッド(=この管理人ができる仕事)
    // 「認証サービスを登録する」仕事

    this.providers[name] = provider;
    // providers['github'] = GitHubProviderを保存
  }
}
```

### クラスとインスタンスの関係

```javascript
// 設計図を作る
class 車 {
  constructor(色) {
    this.色 = 色;
  }

  走る() {
    console.log(this.色 + "の車が走る");
  }
}

// 設計図から実物を作る
const 赤い車 = new 車("赤");
const 青い車 = new 車("青");

赤い車.走る(); // 「赤の車が走る」
青い車.走る(); // 「青の車が走る」
```

### Singleton(シングルトン)パターン

```javascript
// 通常: 何個でも作れる
const manager1 = new AuthManager();
const manager2 = new AuthManager(); // 別物

// Singleton: 1個しか作らない
export default new AuthManager();
// ↑ 最初から1個作って、それを共有する

// どこで使っても同じ1個
import AuthManager from "./AuthManager.js";
// みんな同じAuthManagerを使う
```

**なぜ 1 個だけ?**

- セッション情報など、全員で共有すべき情報を扱うから
- 複数あると情報がバラバラになって混乱する

### SessionManager - セッション記録係

**役割**: 「誰がログインしているか」を記録・管理

```javascript
class SessionManager {
  constructor() {
    this.sessions = new Map();
    // ↑ セッション情報を入れる箱
    // Map {
    //   'セッションID1' => { ユーザー情報 },
    //   'セッションID2' => { ユーザー情報 }
    // }
  }

  create(userId, userData) {
    const sessionId = this.generateSessionId();
    // ↑ ランダムなIDを生成
    // 例: 'a1b2c3d4e5f6...'

    this.sessions.set(sessionId, {
      userId: userId,
      userData: userData,
      expiresAt: Date.now() + 86400000,
      // ↑ Date.now() = 今の時刻(ミリ秒)
      // 86400000 = 24時間(ミリ秒)
      // → 24時間後に期限切れ
    });

    return sessionId;
  }

  get(sessionId) {
    const session = this.sessions.get(sessionId);
    // ↑ IDでセッション情報を取り出す

    if (!session) {
      // ↑ 「!」= 「ない」という意味
      // session が存在しない場合
      return null; // 何も返さない
    }

    if (Date.now() > session.expiresAt) {
      // ↑ 今の時刻 > 期限
      // = 期限切れ
      this.sessions.delete(sessionId);
      return null;
    }

    return session; // セッション情報を返す
  }
}
```

### Map の使い方

```javascript
const box = new Map();
// ↑ 新しい箱を作る

// 入れる
box.set("鍵A", "値1");
box.set("鍵B", "値2");

// 取り出す
const value = box.get("鍵A"); // '値1'

// 存在確認
box.has("鍵A"); // true
box.has("鍵C"); // false

// 削除
box.delete("鍵A");
```

## 6. Provider - サービスごとの通訳

**役割**: GitHub 専用の通訳。GitHub との会話方法を知っている

```javascript
class GitHubProvider {
  constructor(config) {
    // ↑ 初期設定を受け取る
    // config = { clientId: '...', clientSecret: '...', ... }

    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    // ↑ GitHubから発行された「アプリの身分証明書」
  }

  async exchangeCodeForToken(code) {
    // ↑ 「async」= この処理は時間がかかる
    // 「await」と一緒に使う

    const response = await fetch(this.tokenUrl, {
      // ↑ 「await」= 結果が返ってくるまで待つ
      // 「fetch」= 他のサーバーに問い合わせる

      method: "POST",
      // ↑ POST = 「データを送って処理してください」

      headers: {
        "Content-Type": "application/json",
      },
      // ↑ headers = 追加情報
      // 「JSONという形式で送ります」という宣言

      body: JSON.stringify({
        code: code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      // ↑ body = 送るデータ
      // JSON.stringify = JavaScriptオブジェクトを文字列に変換
    });

    const data = await response.json();
    // ↑ 返ってきた文字列をJavaScriptオブジェクトに変換

    return data.access_token;
    // ↑ トークンだけを返す
  }
}
```

### async/await の意味

```javascript
// 例: コーヒーを買う

// ① 待たない書き方(うまくいかない)
function コーヒー買う() {
  const コーヒー = お店に注文する();
  console.log(コーヒー); // undefined(まだ届いてない)
}

// ② 待つ書き方(正しい)
async function コーヒー買う() {
  const コーヒー = await お店に注文する();
  // ↑ コーヒーができるまで待つ
  console.log(コーヒー); // ちゃんとコーヒーが入ってる
}
```

**ルール**:

- `await` を使うには、関数に `async` をつける必要がある
- `await` の右側の処理が終わるまで、次に進まない

### fetch の役割

```javascript
// 生活での例え
fetch("https://github.com/api/user", {
  method: "GET",
  headers: { Authorization: "Bearer トークン" },
});

// = 郵便を送るようなもの
// 宛先: https://github.com/api/user
// 種類: GET(情報ください)
// 添付: Authorization(身分証明書)
```

## 処理の流れ(全体を通して)

### シーン 1: ログインボタンを押す

```
【ブラウザ】
ユーザー: 「Login with GitHub」ボタンをクリック
        ↓
ブラウザ: GET /auth/github をサーバーに送る
```

```
【サーバー】
Express: リクエストを受信
        ↓
ミドルウェアチェーン:
  express.json()   → 何もしない(GETなのでbodyがない)
  cookieParser()   → Cookieを読む(まだ何もない)
  ログミドルウェア  → コンソールに記録
        ↓
ルーター: /auth/:provider にマッチ
  provider = 'github'
        ↓
authRoutes: AuthManager.startAuthentication('github') を呼び出し
```

```
【AuthManager】
1. State生成
   const state = crypto.randomBytes(16).toString('hex');
   // crypto.randomBytes = ランダムな数字を生成
   // .toString('hex') = 16進数の文字列に変換
   // 結果: 'a1b2c3d4e5f6...'

2. Stateを記録(CSRF対策)
   this.pendingStates.set('a1b2c3d4', { provider: 'github' });
   // 「このStateはGitHub認証用」と記録

3. GitHubProviderに依頼
   return provider.getAuthorizationUrl('a1b2c3d4');
```

```
【GitHubProvider】
URLを組み立て:
  const params = new URLSearchParams({
    // URLSearchParams = URLの?以降を作るツール
    client_id: this.clientId,
    state: 'a1b2c3d4',
    scope: 'read:user'
  });

  結果:
  'https://github.com/login/oauth/authorize?
   client_id=YOUR_ID&
   state=a1b2c3d4&
   scope=read:user'
```

```
【サーバー → ブラウザ】
Express: res.redirect(GitHub URL)
        ↓
ブラウザ: GitHubのページに自動で移動
```

```
【ブラウザ】
GitHub のログイン画面が表示される
「このアプリにアクセスを許可しますか?」
```

### シーン 2: GitHub で許可を押す

```
【GitHub側】
ユーザー: 「Authorize」ボタンをクリック
        ↓
GitHub: 認可コード生成
  code = 'def456...'
        ↓
GitHub: ブラウザをリダイレクト
  'http://localhost:3000/auth/github/callback?
   code=def456&
   state=a1b2c3d4'
```

```
【ブラウザ】
自動的にあなたのサーバーに戻る
GET /auth/github/callback?code=def456&state=a1b2c3d4
```

```
【サーバー】
Express: リクエスト受信
        ↓
ルーター: /auth/:provider/callback にマッチ
        ↓
authRoutes:
  const code = req.query.code;   // 'def456'
  const state = req.query.state; // 'a1b2c3d4'

  // ↑ req.query = URL の ? 以降のデータ
  //   ?code=def456&state=a1b2c3d4
  //   → { code: 'def456', state: 'a1b2c3d4' }

  AuthManager.handleCallback('github', code, state) を呼び出し
```

```
【AuthManager】
1. State検証
   if (!this.pendingStates.has('a1b2c3d4')) {
     throw new Error('不正なリクエスト');
   }
   // ↑ 「このStateは自分が発行したものか?」確認
   // なければ = 攻撃者が偽のリクエストを送ってきた可能性

   this.pendingStates.delete('a1b2c3d4');
   // ↑ 使用済みにする(2回使えないようにする)

2. トークン取得
   const token = await provider.exchangeCodeForToken('def456');
```

```
【GitHubProvider】
GitHubサーバーに問い合わせ:
  POST https://github.com/login/oauth/access_token
  Body: {
    code: 'def456',
    client_id: 'YOUR_ID',
    client_secret: 'YOUR_SECRET'
  }

  ↓ GitHubからの返信を待つ

  Response: {
    access_token: 'gho_xxxxx...',
    token_type: 'bearer'
  }

  return 'gho_xxxxx...';
```

```
【AuthManager】
3. ユーザー情報取得
   const userInfo = await provider.getUserInfo('gho_xxxxx');
```

```
【GitHubProvider】
GitHubサーバーに問い合わせ:
  GET https://api.github.com/user
  Header: Authorization: Bearer gho_xxxxx
  // ↑ 「このトークンを持ってます」という証明

  ↓ GitHubからの返信を待つ

  Response: {
    id: 12345,
    login: 'yourname',
    email: 'you@example.com',
    avatar_url: 'https://...'
  }

  正規化して返す:
  return {
    provider: 'github',
    providerId: '12345',
    username: 'yourname',
    email: 'you@example.com',
    avatarUrl: 'https://...'
  };
```

```
【AuthManager】
4. セッション作成
   const sessionId = SessionManager.create('12345', userInfo);
```

```
【SessionManager】
1. セッションID生成
   const sessionId = crypto.randomBytes(32).toString('hex');
   // 結果: 'xyz789abcdef...'

2. セッション情報を保存
   this.sessions.set('xyz789abcdef', {
     userId: '12345',
     userData: {
       provider: 'github',
       username: 'yourname',
       email: 'you@example.com',
       avatarUrl: 'https://...'
     },
     createdAt: 1234567890123,
     expiresAt: 1234567890123 + 86400000
   });

   return 'xyz789abcdef';
```

```
【authRoutes】
Cookieにセット:
  res.cookie('sessionId', 'xyz789abcdef', {
    httpOnly: true,
    // ↑ JavaScriptから読めないようにする(セキュリティ)

    maxAge: 86400000
    // ↑ 有効期限24時間
  });

リダイレクト:
  res.redirect('/profile');
```

```
【ブラウザ】
Cookie保存: sessionId=xyz789abcdef
        ↓
自動的に /profile に移動
GET /profile
Cookie: sessionId=xyz789abcdef
```

### シーン 3: プロフィールページを見る

```
【サーバー】
Express: GET /profile を受信
  Cookie: sessionId=xyz789abcdef
        ↓
ミドルウェアチェーン:
  cookieParser() → req.cookies = { sessionId: 'xyz789abcdef' }
        ↓
ルーター: /profile にマッチ
        ↓
requireAuth ミドルウェア実行
```

```
【requireAuth ミドルウェア】
1. Cookieからセッション ID 取得
   const sessionId = req.cookies.sessionId; // 'xyz789abcdef'

2. セッション確認
   const session = SessionManager.get('xyz789abcdef');
```

```
【SessionManager】
1. セッション取得
   const session = this.sessions.get('xyz789abcdef');
   // {
   //   userId: '12345',
   //   userData: { username: 'yourname', ... },
   //   expiresAt: 1234567890123 + 86400000
   // }

2. 有効期限チェック
   if (Date.now() > session.expiresAt) {
     // 期限切れ
     this.sessions.delete('xyz789abcdef');
     return null;
   }

   return session; // 有効
```

```
【requireAuth ミドルウェア】
3. ユーザー情報を追加
   req.user = session.userData;
   // req.user = {
   //   provider: 'github',
   //   username: 'yourname',
   //   email: 'you@example.com',
   //   ...
   // }

4. 次の処理へ
   next();
```

```
【ルートハンドラー】
router.get('/profile', requireAuth, (req, res) => {
  // req.user が使える!
  res.send(`
    <h1>Profile</h1>
    <p>Username: ${req.user.username}</p>
    <img src="${req.user.avatarUrl}" />
  `);
});
```

```
【ブラウザ】
HTMLを受信して表示:
  Profile
  Username: yourname
  [アバター画像]
```

## データ構造の変化(図解)

### pendingStates (AuthManager)

```javascript
// 認証開始時
Map {
  'a1b2c3d4' => { provider: 'github', createdAt: 1234567890 }
}

// コールバック時(検証後)
Map {
  // 削除される(使用済み)
}
```

### sessions (SessionManager)

```javascript
// ログイン後
Map {
  'xyz789abcdef' => {
    userId: '12345',
    userData: {
      provider: 'github',
      providerId: '12345',
      username: 'yourname',
      email: 'you@example.com',
      avatarUrl: 'https://avatars.githubusercontent.com/...'
    },
    createdAt: 1734908400000,
    expiresAt: 1734994800000  // 24時間後
  }
}

// 複数ユーザーがログインすると
Map {
  'xyz789abcdef' => { userId: '12345', ... },
  'abc123defgh' => { userId: '67890', ... },
  'hij456klmno' => { userId: '11111', ... }
}
```

### req オブジェクトの変化

```javascript
// 最初(ブラウザからのリクエスト)
{
  method: 'GET',
  url: '/profile',
  headers: { Cookie: 'sessionId=xyz789abcdef' },
  cookies: {},  // まだ空
  user: undefined  // まだ存在しない
}

// ↓ cookieParser() ミドルウェア通過後

{
  method: 'GET',
  url: '/profile',
  headers: { Cookie: 'sessionId=xyz789abcdef' },
  cookies: { sessionId: 'xyz789abcdef' },  // パース済み
  user: undefined
}

// ↓ requireAuth ミドルウェア通過後

{
  method: 'GET',
  url: '/profile',
  headers: { Cookie: 'sessionId=xyz789abcdef' },
  cookies: { sessionId: 'xyz789abcdef' },
  user: {  // 追加された!
    provider: 'github',
    username: 'yourname',
    email: 'you@example.com',
    ...
  }
}
```

## セキュリティの仕組み

### 1. State Parameter (CSRF 対策)

**攻撃シナリオ(State がない場合)**:

```
悪い人: 罠サイトを作る
      「このリンクをクリックしてね!」
      ↓
被害者: クリック
      ↓
悪い人のサーバー: GitHubに認可リクエスト
      ただし、redirect_uri を被害者のアプリに設定
      ↓
被害者: 知らないうちに悪い人のアカウントでログイン
```

**State で防ぐ**:

1. あなたのアプリ: ランダムな State 生成 'a1b2c3d4'
   pendingStates に保存
2. GitHub にリダイレクト(State 付き)

3. GitHub からコールバック
   code=xxx&state=a1b2c3d4
4. あなたのアプリ: State 検証
   pendingStates.has('a1b2c3d4') ? → Yes なら本物
   → No なら攻撃

**なぜ安全?**

- 攻撃者は正しい State を知らない
- State は毎回ランダムに生成される
- 1 回使ったら削除される(再利用不可)

### 2. HttpOnly Cookie (XSS 対策)

**攻撃シナリオ(HttpOnly がない場合)**:

悪いコード:

```
<script>
const sessionId = document.cookie;
// セッション ID を盗む
送信('悪い人のサーバー', sessionId);
</script>
```

悪い人: 盗んだセッション ID でなりすまし

**HttpOnly で防ぐ**:

```javascript
res.cookie("sessionId", "xyz789", {
  httpOnly: true,
  // ↑ JavaScriptから読めなくなる
});

// ブラウザで試しても...
console.log(document.cookie);
// → 空文字列(読めない!)

// でもブラウザは自動的にCookieを送る
// GET /profile
// Cookie: sessionId=xyz789  ← 自動で付く
```

### 3. Client Secret (アプリの証明)

**なぜ必要?**

```
// もしClient Secretがなかったら...
悪い人: 「私はあなたのアプリです!」と嘘をつく
      コードをトークンに交換できてしまう

// Client Secretがあると...
GitHub: 「Client Secretを見せて」
悪い人: 「...持ってない」
GitHub: 「じゃあダメ」
```

**使い方**:

```javascript
// トークン交換時のみ使用
const response = await fetch(tokenUrl, {
  body: JSON.stringify({
    code: code,
    client_id: "YOUR_ID", // 公開してOK
    client_secret: "YOUR_SECRET", // 絶対に秘密!
  }),
});
```

**重要**: Client Secret は**サーバー側だけ**で使う。ブラウザに送ってはいけない!

### 4. セッション有効期限

```javascript
// セッション作成時
{
  createdAt: 1734908400000,    // 作成時刻
  expiresAt: 1734994800000     // 24時間後
}

// アクセス時にチェック
if (Date.now() > session.expiresAt) {
  // 期限切れ → ログアウト
  sessions.delete(sessionId);
  return null;
}
```

**なぜ必要?**

- セッション ID が漏れても、時間が経てば使えなくなる
- 長期間ログインしっぱなしを防ぐ

## よくある疑問

### Q1: なぜ認可コードとアクセストークンの 2 段階?

**生活での例え**:

```
引換券方式(安全):
  店員: 「この引換券を持ってレジに行ってください」
  あなた: レジで引換券を商品に交換
  → 引換券が盗まれても、レジで本人確認される

直接渡し(危険):
  店員: 「はい、商品どうぞ!」(皆の前で渡す)
  → 誰かに見られたら盗まれる
```

**OAuth での流れ**:

```
1. ブラウザ ← 認可コード ← GitHub
   ↓ ブラウザからサーバーへ送る(URLに含まれる=見える)

2. サーバー → 認可コード → GitHub
   サーバー ← アクセストークン ← GitHub
   ↑ サーバー同士の通信(暗号化された通信=安全)
```

**メリット**:

- 認可コード: 短命(数分で失効)、1 回だけ使える
- アクセストークン: ブラウザを経由しない = 安全

### Q2: なぜクラスを使うの?普通の関数じゃダメ?

**関数だけの場合**:

```javascript
// 問題: データが散らばる
let sessions = new Map();
let providers = {};

function createSession(userId, userData) {
  // sessions を使う
}

function getSession(sessionId) {
  // sessions を使う
}

// 他のファイルでも sessions を使いたい...
// でもどうやって共有する?
```

**クラスを使うと**:

```javascript
class SessionManager {
  constructor() {
    this.sessions = new Map();
    // ↑ データがクラス内にまとまる
  }

  create(userId, userData) {
    this.sessions.set(...);
    // ↑ 自分のデータを使う
  }

  get(sessionId) {
    return this.sessions.get(sessionId);
  }
}

// 1個作って共有
export default new SessionManager();
```

**メリット**:

- 関連するデータと機能がまとまる
- 外部から勝手に触られない(`this.sessions`は外から見えない)
- テストしやすい

### Q3: なぜ await が必要?

**例: レストランでの注文**

```javascript
// await がない場合(間違い)
function 昼食() {
  const 料理 = 注文する("カレー");
  console.log(料理); // undefined(まだ来てない)
  食べる(料理); // エラー!(料理がない)
}

// await がある場合(正しい)
async function 昼食() {
  const 料理 = await 注文する("カレー");
  console.log(料理); // カレー(ちゃんと届いた)
  食べる(料理); // OK!
}
```

**fetch の場合**:

```javascript
// ネットワーク通信は時間がかかる
async function ユーザー情報取得() {
  // GitHub サーバーに問い合わせ(0.5秒かかる)
  const response = await fetch("https://api.github.com/user");

  // 返ってきたデータを解析(0.1秒かかる)
  const data = await response.json();

  return data; // これで初めて使える
}
```

### Q4: Map と 普通のオブジェクト {} の違いは?

```javascript
// 普通のオブジェクト
const obj = {};
obj["key1"] = "value1";
obj["key2"] = "value2";

// Map
const map = new Map();
map.set("key1", "value1");
map.set("key2", "value2");
```

**違い**:

```javascript
// 1. キーの型
const obj = {};
obj[123] = 'a';     // 数字が文字列に変換される
console.log(obj);   // { '123': 'a' }

const map = new Map();
map.set(123, 'a');  // 数字のまま
map.set('123', 'b'); // 別のキー

// 2. サイズの取得
obj.length;    // undefined
Object.keys(obj).length;  // 2(面倒)

map.size;      // 2(簡単)

// 3. 繰り返し
for (const key in obj) { ... }  // 順番は保証されない

for (const [key, value] of map) { ... }  // 追加順

// 4. 削除
delete obj.key1;     // 遅い
map.delete('key1');  // 速い
```

**いつ使う?**

- 頻繁に追加・削除する → Map
- 設定データなど固定的 → Object

## JavaScript 特有の表記の説明

### 分割代入 (Destructuring)

```javascript
// オブジェクトから取り出す
const user = {
  name: "Alice",
  age: 25,
  email: "alice@example.com",
};

// 古い書き方
const name = user.name;
const age = user.age;

// 新しい書き方(分割代入)
const { name, age } = user;
// name = 'Alice'
// age = 25

// 関数の引数で使う
function greet({ name, age }) {
  console.log(`${name}さん(${age}歳)`);
}
greet(user); // Aliceさん(25歳)
```

**実際のコード例**:

```javascript
router.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  // ↑ これは以下と同じ
  // const code = req.query.code;
  // const state = req.query.state;
});
```

### スプレッド演算子 (...)

```javascript
// 配列のコピー
const arr1 = [1, 2, 3];
const arr2 = [...arr1]; // [1, 2, 3]

// 配列の結合
const arr3 = [...arr1, 4, 5]; // [1, 2, 3, 4, 5]

// オブジェクトのコピー
const user = { name: "Alice", age: 25 };
const newUser = { ...user, age: 26 };
// { name: 'Alice', age: 26 }
```

### テンプレート文字列 (バッククォート)

```javascript
// 古い書き方
const name = "Alice";
const message = "Hello, " + name + "!";

// 新しい書き方
const message = `Hello, ${name}!`;
//              ↑ バッククォート(` `)で囲む
//                  ${変数} で埋め込む

// 複数行も書ける
const html = `
  <div>
    <h1>${name}</h1>
    <p>Age: ${age}</p>
  </div>
`;
```

### オプショナルチェーン (?.)

```javascript
// user が存在するか分からない場合

// 古い書き方
const email = user && user.profile && user.profile.email;

// 新しい書き方
const email = user?.profile?.email;
// user が null/undefined なら undefined
// そうでなければ user.profile.email
```

### Nullish Coalescing (??)

```javascript
// デフォルト値を設定

// || の問題点
const value = 0 || 10; // 10(0 は false扱い)
const value = "" || "abc"; // 'abc'(空文字も false扱い)

// ?? を使うと
const value = 0 ?? 10; // 0(0 は有効な値)
const value = "" ?? "abc"; // ''(空文字も有効)
const value = null ?? 10; // 10(null だけを除外)
```

## 全体のフロー(最終まとめ)

```
┌──────────────────────────────────────────────────────┐
│ Phase 1: ログインボタンクリック                        │
└──────────────────────────────────────────────────────┘

ブラウザ
  ↓ GET /auth/github
Express (app.js)
  ↓ ミドルウェアチェーン
authRoutes (routes/auth.js)
  ↓ AuthManager.startAuthentication('github')
AuthManager
  ↓ state = 'a1b2c3d4' 生成・保存
  ↓ provider.getAuthorizationUrl(state)
GitHubProvider
  ↓ URLを生成
  ← 'https://github.com/login/oauth/authorize?...'
authRoutes
  ↓ res.redirect(URL)
ブラウザ
  → GitHubのページに移動


┌──────────────────────────────────────────────────────┐
│ Phase 2: GitHubで認証                                 │
└──────────────────────────────────────────────────────┘

GitHubページ
  ↓ ユーザーが「Authorize」クリック
GitHub サーバー
  ↓ code = 'def456' 生成
  ← リダイレクト: /auth/github/callback?code=def456&state=a1b2c3d4
ブラウザ
  → あなたのサーバーに戻る


┌──────────────────────────────────────────────────────┐
│ Phase 3: トークン交換とセッション作成                  │
└──────────────────────────────────────────────────────┘

ブラウザ
  ↓ GET /auth/github/callback?code=def456&state=a1b2c3d4
Express
  ↓ ミドルウェアチェーン
authRoutes
  ↓ AuthManager.handleCallback('github', 'def456', 'a1b2c3d4')
AuthManager
  ↓ State検証: 'a1b2c3d4' は有効? → Yes
  ↓ provider.exchangeCodeForToken('def456')
GitHubProvider
  ↓ POST https://github.com/.../access_token
  ↓   body: { code: 'def456', client_secret: '...' }
GitHub サーバー
  ← { access_token: 'gho_xxxxx' }
GitHubProvider
  ↓ return 'gho_xxxxx'
AuthManager
  ↓ provider.getUserInfo('gho_xxxxx')
GitHubProvider
  ↓ GET https://api.github.com/user
  ↓   header: Authorization: Bearer gho_xxxxx
GitHub サーバー
  ← { id: 12345, login: 'yourname', ... }
GitHubProvider
  ↓ return { provider: 'github', username: 'yourname', ... }
AuthManager
  ↓ SessionManager.create('12345', userInfo)
SessionManager
  ↓ sessionId = 'xyz789' 生成
  ↓ sessions.set('xyz789', { userId: '12345', ... })
  ← return 'xyz789'
AuthManager
  ← return { sessionId: 'xyz789', userInfo: {...} }
authRoutes
  ↓ res.cookie('sessionId', 'xyz789', { httpOnly: true })
  ↓ res.redirect('/profile')
ブラウザ
  ↓ Cookie保存: sessionId=xyz789
  → GET /profile


┌──────────────────────────────────────────────────────┐
│ Phase 4: 保護されたページにアクセス                    │
└──────────────────────────────────────────────────────┘

ブラウザ
  ↓ GET /profile
  ↓ Cookie: sessionId=xyz789
Express
  ↓ cookieParser(): req.cookies = { sessionId: 'xyz789' }
protectedRoutes
  ↓ requireAuth ミドルウェア
requireAuth
  ↓ sessionId = req.cookies.sessionId
  ↓ SessionManager.get('xyz789')
SessionManager
  ↓ session = sessions.get('xyz789')
  ↓ 有効期限チェック: OK
  ← return session
requireAuth
  ↓ req.user = session.userData
  ↓ next()
ルートハンドラー
  ↓ res.send(`<h1>${req.user.username}</h1>`)
ブラウザ
  ← HTML受信・表示
```

## 各コンポーネントの責任(まとめ)

```
┌─────────────────────────────────────────────┐
│ app.js                                      │
│ ・サーバーの起動                             │
│ ・ミドルウェアの登録                         │
│ ・ルーターの登録                             │
│ ・プロバイダーの初期化                       │
└─────────────────────────────────────────────┘
              ↓ 使う
┌─────────────────────────────────────────────┐
│ authRoutes (routes/auth.js)                 │
│ ・HTTPリクエストの受付                       │
│ ・パラメータの取り出し                       │
│ ・AuthManagerへの委譲                        │
│ ・Cookieの設定                               │
│ ・リダイレクト                               │
└─────────────────────────────────────────────┘
              ↓ 使う
┌─────────────────────────────────────────────┐
│ AuthManager (auth/AuthManager.js)           │
│ ・認証フロー全体の調整                       │
│ ・State生成・検証(CSRF対策)                  │
│ ・プロバイダーの管理                         │
│ ・Providerとの橋渡し                         │
└─────────────────────────────────────────────┘
        ↓ 使う              ↓ 使う
┌──────────────────┐  ┌────────────────────┐
│ GitHubProvider   │  │ SessionManager     │
│ ・認可URL生成    │  │ ・セッションID生成 │
│ ・トークン交換   │  │ ・セッション保存   │
│ ・ユーザー情報   │  │ ・セッション取得   │
│  取得            │  │ ・有効期限管理     │
└──────────────────┘  └────────────────────┘
        ↓
┌──────────────────┐
│ GitHub API       │
│ (外部サービス)    │
└──────────────────┘
```

## データの所有者

```
pendingStates: Map
  └─ 所有者: AuthManager
  └─ 役割: 進行中の認証を追跡

sessions: Map
  └─ 所有者: SessionManager
  └─ 役割: ログイン中のユーザーを記録

req.cookies: Object
  └─ 所有者: Express(cookieParser)
  └─ 役割: ブラウザから送られたCookieを解析

req.user: Object
  └─ 所有者: requireAuth ミドルウェア
  └─ 役割: 認証済みユーザー情報を保持
```

## 設計の原則

### 1. 単一責任の原則

各コンポーネントは 1 つの仕事だけを担当:

- `authRoutes`: HTTP の入出力
- `AuthManager`: 認証の流れ
- `GitHubProvider`: GitHub 固有の処理
- `SessionManager`: セッション管理

### 2. 依存性の注入

```javascript
// 悪い例: 直接参照
class AuthManager {
  handleCallback() {
    const provider = new GitHubProvider(); // 固定
  }
}

// 良い例: 外から渡す
class AuthManager {
  registerProvider(name, provider) {
    this.providers[name] = provider; // 柔軟
  }
}

// 使う側
AuthManager.registerProvider("github", new GitHubProvider());
AuthManager.registerProvider("google", new GoogleProvider());
```

### 3. 関心の分離

```
HTTPレイヤー     : authRoutes, protectedRoutes
ビジネスロジック : AuthManager
データアクセス   : SessionManager, GitHubProvider
```

## 次のステップの提案

理解を深めるために、以下を試してみてください:

### 1. ログを充実させる

```javascript
// 各ステップでログ出力
console.log("[1] ログイン開始");
console.log("[2] State生成:", state);
console.log("[3] GitHubへリダイレクト");
// ...

// 実行すると流れが見える!
```

### 2. エラーを起こしてみる

```javascript
// わざと間違ったStateを使う
AuthManager.handleCallback("github", code, "間違ったstate");
// → エラーメッセージを確認

// セッションIDを削除して試す
SessionManager.destroy(sessionId);
// → 再アクセスでどうなる?
```

### 3. デバッガーを使う

```javascript
// この行にブレークポイントを設定
const session = SessionManager.get(sessionId);
// ↑ ここで止まって、変数を確認できる
```

### 4. 機能を追加する

- ログアウト機能
- セッションの自動延長
- 「ログインしたままにする」チェックボックス
