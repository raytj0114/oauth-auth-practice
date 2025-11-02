import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 保護されたルート
router.get('/profile', requireAuth, (req, res) => {
  //プロバイダーによって表示を変える
  const isOAuth = req.user.provider !== 'local';
  const providerDisplay = isOAuth
    ? `OAuth (${req.user.provider})`
    : 'Email/Password';
 
  res.send(`
    <!DOCTYPE>
    <html>
      <head>
        <title>Profile</title>
        <style>
          body {
            font-family: sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
          }
          .profile-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            background: #f9f9f9;
          }
          .avatar {
            border-radius: 50%;
            margin: 10px 0;
          }
          .info-row {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 4px;
          }
          pre {
            background: #fff;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
          }
          button {
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
          }
          button:hover {
            background: #c82333;
          }
          a {
            color: #0366d6;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="profile-card">
          <h1>Profile</h1>

          ${req.user.avatarUrl ? `<img src="${req.user.avatarUrl}" width="100" alt="Avatar" />` : ''}

          <div class="info-row">
            <strong>UserName:</strong> ${req.user.username}
          </div>

          <div class="info-row">
            <strong>Email:</strong> ${req.user.email || 'Not provided'}
          </div>
          
          <div class="info-row">
            <strong>Login Method:</strong> ${providerDisplay}
          </div>
        
          <h2>Full User Data:</h2>
          <pre>${JSON.stringify(req.user, null, 2)}</pre>
          
          <form method="POST" action="/auth/logout">
            <button type="submit">Logout</button>
          </form>

          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
    </html>
  `);
});

export default router;