import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 保護されたルート
router.get('/profile', requireAuth, (req, res) => {
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
          img {
            border-radius: 50%;
            margin: 10px 0;
          }
          pre {
            background: #fff;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
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
          <img src="${req.user.avatarUrl}" width="100" alt="Avatar" />
          <p><strong>UserName:</strong> ${req.user.username}</p>
          <p><strong>Provider:</strong> ${req.user.provider}</p>
          <p><strong>Email:</strong> ${req.user.email || 'Not provided'}</p>        
        
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