# OAuth 2.0 ガイド

このガイドでは、OAuth 2.0 の基礎から実装の詳細まで、段階的に説明します。

## 目次

1. [OAuth とは](#oauth-とは)
2. [なぜ OAuth を使うのか](#なぜ-oauth-を使うのか)
3. [このプロジェクトの認証方式](#このプロジェクトの認証方式)
4. [OAuth フローの全体像](#oauth-フローの全体像)
5. [詳細なフロー解説](#詳細なフロー解説)
6. [セキュリティの仕組み](#セキュリティの仕組み)
7. [プロバイダーごとの違い](#プロバイダーごとの違い)
8. [タイミング図](#タイミング図)

---

## OAuth とは

**一言で**: パスワードを共有せずに、他のサービスの認証を使える仕組み

### 日常の例え

**従来の方法(パスワード認証)**:

```
レストランごとに会員登録 → パスワードを覚える必要がある
```

**OAuth**:

```
レストラン「GitHubの会員証で本人確認してください」
→ GitHubが「この人は会員です」と証明
→ レストラン「OK、入店どうぞ」
```

---

## なぜ OAuth を使うのか

### ユーザーのメリット

- ✅ パスワードを何個も覚えなくていい
- ✅ 信頼できるサービス(GitHub/Google)の認証を使える
- ✅ パスワードを新しいアプリに教える必要がない

### アプリのメリット

- ✅ パスワードを管理しなくていい
- ✅ 漏洩リスクがない
- ✅ ユーザーが登録しやすい

### GitHub/Google のメリット

- ✅ 自分のユーザーが安全に他サービスを使える
- ✅ エコシステムの拡大

---

## このプロジェクトの認証方式

### 1. メール/パスワード認証

```
ユーザー → アプリにメール/パスワードを登録
       → ログイン時にパスワードを入力
```

### 2. GitHub OAuth

```
ユーザー → アプリで「GitHubでログイン」をクリック
       → GitHubで許可
       → アプリにログイン完了
```

**長所**: GitHub アカウントがあればすぐ使える  
**用途**: 開発者向けアプリに最適

### 3. Google OAuth

```
ユーザー → アプリで「Googleでログイン」をクリック
       → Googleで許可
       → アプリにログイン完了
```

**長所**: ほとんどの人が Google アカウントを持っている  
**用途**: 一般ユーザー向けアプリに最適

---

## OAuth フローの全体像

### 登場人物

```
┌─────────────────┐
│  ユーザー        │ あなた(ブラウザを操作)
└─────────────────┘
       ↕
┌─────────────────┐
│  アプリ          │ このプロジェクト(localhost:3000)
└─────────────────┘
       ↕
┌─────────────────┐
│  GitHub/Google  │ 認証プロバイダー
└─────────────────┘
```

### 5 つのフェーズ

```
フェーズ1: ログインボタンクリック
    ↓
フェーズ2: GitHub で許可
    ↓
フェーズ3: アプリがトークンを取得
    ↓
フェーズ4: ユーザー情報取得
    ↓
フェーズ5: ログイン完了
```

---

## 詳細なフロー解説

### フェーズ 1: ログインボタンをクリック

```
1. ユーザー: 「Login with GitHub」クリック
   ↓
2. ブラウザ: GET /auth/github
   ↓
3. アプリ:
   - State生成(ランダムな文字列) 例: "a1b2c3d4"
   - GitHubのURLを生成:
     https://github.com/login/oauth/authorize?
       client_id=YOUR_APP_ID&
       state=a1b2c3d4&
       redirect_uri=http://localhost:3000/auth/github/callback
   ↓
4. ブラウザ: GitHub のページに自動で移動
```

### フェーズ 2: GitHub で許可

```
5. GitHub: 「このアプリにアクセスを許可しますか?」
   ↓
6. ユーザー: 「Authorize」クリック
   ↓
7. GitHub:
   - 認可コード生成 例: "def456"
   - ブラウザをアプリに戻す:
     http://localhost:3000/auth/github/callback?
       code=def456&
       state=a1b2c3d4
```

**重要**:

- 認可コードは 1 回限り、短時間(数分)で失効
- ユーザー情報はまだ取得しない

### フェーズ 3: アプリがトークンを取得

```
8. アプリ:
   - State確認: "a1b2c3d4" は自分が発行したもの? → Yes
   - GitHub にリクエスト(サーバー間通信):
     POST https://github.com/login/oauth/access_token
     {
       code: "def456",
       client_id: YOUR_APP_ID,
       client_secret: YOUR_APP_SECRET  ← 秘密!
     }
   ↓
9. GitHub:
   - 認可コード確認 → OK
   - アクセストークン発行:
     {
       access_token: "gho_xxxxx..."
     }
```

**重要**:

- client_secret はサーバー側だけで使う(ブラウザに送らない)
- この通信はブラウザを経由しない(安全)

### フェーズ 4: ユーザー情報取得

```
10. アプリ:
    - GitHub にリクエスト:
      GET https://api.github.com/user
      Authorization: Bearer gho_xxxxx...
    ↓
11. GitHub:
    - トークン確認 → OK
    - ユーザー情報を返す:
      {
        id: 12345,
        login: "yourname",
        email: "you@example.com",
        avatar_url: "https://..."
      }
```

### フェーズ 5: ログイン完了

```
12. アプリ:
    - ユーザー情報を保存
    - セッションID生成 例: "xyz789"
    - Cookie にセット
    ↓
13. ブラウザ: プロフィールページに移動
```

---

## セキュリティの仕組み

### なぜ 2 段階?(認可コード + トークン)

#### ❌ 1 段階だとダメな理由

```
GitHub → ブラウザ → トークンを直接渡す
                  ↑ URLに含まれる = 見える = 危険!
```

#### ✅ 2 段階が安全な理由

```
ステップ1: GitHub → ブラウザ → 認可コード
           - 短命(数分で失効)
           - 1回しか使えない
           - 漏れても問題少ない

ステップ2: アプリ → GitHub → トークン交換
           - サーバー間通信(暗号化)
           - ブラウザを経由しない
           - client_secret で本人確認
```

### State パラメータ(CSRF 対策)

#### 攻撃シナリオ(State がない場合)

```
1. 攻撃者: 罠サイトを作る
   罠リンク: https://github.com/login/oauth/authorize?
             client_id=被害者のアプリ&
             redirect_uri=被害者のアプリ/callback

2. 被害者: 罠リンクをクリック

3. 被害者: GitHubで許可(攻撃者のアカウントで)

4. 被害者: 知らずに攻撃者のアカウントでログイン

5. 被害者の行動: 攻撃者のアカウントに記録される
```

#### State で防ぐ

```
1. アプリ: ランダムなState生成 "a1b2c3d4"
           ↓
2. アプリ: State を記録(サーバー側)
           ↓
3. GitHub: State付きでコールバック
           ↓
4. アプリ: State確認
   - 記録にある? → OK(本物のリクエスト)
   - ない? → NG(攻撃 or 古いリクエスト)
```

**実装**:

```javascript
// State生成
const state = crypto.randomBytes(16).toString("hex");
pendingStates.set(state, { provider: "github", createdAt: Date.now() });

// State確認
if (!pendingStates.has(state)) {
  throw new Error("Invalid state"); // 攻撃を防ぐ
}
pendingStates.delete(state); // 使い捨て
```

---

## プロバイダーごとの違い

### GitHub - Google

| 項目               | GitHub           | Google                            |
| ------------------ | ---------------- | --------------------------------- |
| **リクエスト形式** | JSON             | URL エンコード                    |
| **Content-Type**   | application/json | application/x-www-form-urlencoded |
| **ユーザー情報**   | login, email     | name, email, picture              |
| **適している用途** | 開発者向け       | 一般ユーザー向け                  |

### コード例

**GitHub**:

```javascript
// トークン交換
const response = await fetch(tokenUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({ code, client_id, client_secret }),
});
```

**Google**:

```javascript
// トークン交換
const params = new URLSearchParams({ code, client_id, client_secret });
const response = await fetch(tokenUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: params.toString(),
});
```

### 共通の流れ

1. 認可 URL にリダイレクト
2. ユーザーが許可
3. コールバック受信
4. トークン交換
5. ユーザー情報取得

---

## タイミング図

```
ユーザー          ブラウザ              アプリ                GitHub
  |                |                     |                     |
  |                |                     |                     |
  | 1. クリック     |                     |                     |
  |--------------->|                     |                     |
  |                | 2. GET /auth/github |                     |
  |                |-------------------->|                     |
  |                |                     | 3. State生成        |
  |                |                     | 4. URL生成          |
  |                | 5. 302 Redirect     |                     |
  |                |    Location: GitHub |                     |
  |                |<--------------------|                     |
  |                |                     |                     |
  |                |             6. GET (GitHub URL)           |
  |                |------------------------------------------>|
  |                |             7. 認可ページ HTML             |
  |                |<------------------------------------------|
  | 8. ページ表示   |                     |                     |
  |<---------------|                     |                     |
  |                |                     |                     |
  | 9. Authorize   |                     |                     |
  |    クリック     |                     |                     |
  |--------------->|                     |                     |
  |                |              10. POST (許可)              |
  |                |----------------------------------------- >|
  |                |                     |       11. code生成  |
  |                |            12. 302 Redirect               |
  |                |              + code + state               |
  |                |<------------------------------------------|
  |                |                     |                     |
  |                | 13. GET /callback   |                     |
  |                |    ?code=xxx        |                     |
  |                |-------------------->|                     |
  |                |                     | 14. State確認       |
  |                |                     |                     |
  |                |                     | 15. POST token      |
  |                |                     |    (code+secret)    |
  |                |                     |-------------------->|
  |                |                     |       16. token発行 |
  |                |                     |<--------------------|
  |                |                     |                     |
  |                |                     | 17. GET user        |
  |                |                     |    (token)          |
  |                |                     |-------------------->|
  |                |                     |     18. userinfo    |
  |                |                     |<--------------------|
  |                |                     | 19. session作成     |
  |                | 20. 302 /profile    |                     |
  |                |    Set-Cookie       |                     |
  |                |<--------------------|                     |
  |                | 21. GET /profile    |                     |
  |                |-------------------->|                     |
  |                | 22. HTML            |                     |
  |                |<--------------------|                     |
  | 23. 表示       |                     |                     |
  |<---------------|                     |                     |
```

**重要なポイント**:

- **6-7**: ブラウザと GitHub の直接通信
- **15-16, 17-18**: アプリと GitHub の直接通信(ブラウザ経由しない)
- **14**: State 確認でセキュリティを担保

---

## まとめ

### OAuth の本質

- ✅ パスワードを共有しない
- ✅ 信頼できるサービスの認証を借りる
- ✅ 安全な 2 段階フロー(認可コード → トークン)

### セキュリティの要点

- ✅ **State**: CSRF 攻撃を防ぐ
- ✅ **client_secret**: サーバー側だけで使う
- ✅ **認可コード**: 短命、1 回限り
- ✅ **2 段階**: ブラウザにトークンを渡さない
