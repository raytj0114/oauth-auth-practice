import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import UnifiedAuthService from '../auth/UnifiedAuthService.js';
import SessionManager from '../auth/SessionManager.js';

const router = express.Router();

// 保護されたルート
// プロフィール表示
router.get('/profile', requireAuth, (req, res) => {
  // 常に最新のユーザー情報を取得
  const user = UnifiedAuthService.getUserWithAuths(req.user.id);

  if (!user) {
    return res.status(404).send(`
      <h1>User Not Found</h1>
      <p>Your user account could not be found.</p>
      <a href="/">← Back to Home</a>
    `);
  }

  const linkedProviders = user.linkedProviders || [];
 
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Profile</title>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: sans-serif;
          max-width: 800px;
            margin: 50px auto;
            padding: 20px;
          }
          .profile-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            background: #f9f9f9;
          margin-bottom: 20px;
          }
          .section {
          margin: 20px 0;
          }
          .linked-account {
          padding: 10px;
          margin: 5px 0;
          background: white;
          border-radius: 4px;
          border-left: 4px solid #0366d6;
          }
          .info-row {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 4px;
          }
          button {
            background: #dc3545;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
          }
          button:hover {
            opacity: 0.8;
          }
          .btn-primary {
            background: #0366d6;
          }
          .btn-primary:hover {
            background: #0256c4;
          }
          pre {
           background: #fff;
           padding: 15px;
           border-radius: 5px;
           overflow-x: auto;
            font-size: 12px;
          }
          .success-message {
            padding: 10px;
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            border-radius: 4px;
            margin-bottom: 15px;
           }
        </style>
      </head>
      <body>
        <div class="profile-card">
        <h1>👤 Profile</h1>

          ${user.profile?.avatarUrl ? `<img src="${user.profile.avatarUrl}" width="100" style="border-radius: 50%; margin: 10px 0;" alt="Avatar" />` : ''}

          <div class="section">
            <h2>Basic Info</h2>
            <div class="info-row">
              <strong>User ID:</strong> ${user.id}
            </div>
            <div class="info-row">
              <strong>Username:</strong> ${user.username}
            </div>
            <div class="info-row">
              <strong>Email:</strong> ${user.email || 'Not provided'}
            </div>
            <div class="info-row">
              <strong>Member since:</strong> ${new Date(user.createdAt).toLocaleDateString()}
            </div>
            <div class="info-row">
              <strong>Last login:</strong> ${new Date(user.lastLoginAt).toLocaleDateString()}
              </div>
          </div>

          <div class="section">
            <h2>Linked Accounts</h2>
            ${linkedProviders.length === 0 ? '<p>No linked accounts</p>' : ''}
            ${linkedProviders.map(provider => `
              <div class="linked-account">
                <strong>${provider.provider.toUpperCase()}</strong>
                ${provider.email ? ` - ${provider.email}` : ''}
                <br>
                <small>Linked: ${new Date(provider.createdAt).toLocaleDateString()}</small>
                </div>
            `).join('')}
          </div>

          <div class="section">
            <h2>Preferences</h2>
            <div class="info-row">
              <strong>Theme:</strong> ${user.preferences?.theme || 'default'}
            </div>
            <div class="info-row">
              <strong>Language:</strong> ${user.preferences?.language || 'en'}
            </div>

            <form method="POST" action="/profile/preferences">
              <label>Theme: </label>
              <select name="theme">
                <option value="light" ${user.preferences?.theme === 'light' ? 'selected' : ''}>Light</option>
                <option value="dark" ${user.preferences?.theme === 'dark' ? 'selected' : ''}>Dark</option>
              </select>
              <button type="submit" class="btn-primary">Update Theme</button>
            </form>
          </div>

          <div class="section">
            <h2>Full User Data</h2>
          <pre>${JSON.stringify(user, null, 2)}</pre>
          </div>
          
          <form method="POST" action="/auth/logout">
            <button type="submit">Logout</button>
          </form>

          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
    </html>
  `);
});

// 設定更新
router.post('/profile/preferences', requireAuth, (req, res) => {
  const { theme } = req.body;

  try {
    console.log(`[Profile] Updating theme to: ${theme} for user: ${req.user.id}`);
    
    // UserRepository を更新
    const updatedUser = UnifiedAuthService.updatePreferences(req.user.id, { theme });
    
    // セッションも更新(オプション)
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
      SessionManager.updateUserData(sessionId, updatedUser);
    }
    
    console.log(`[Profile] Theme updated successfully`);
    
    res.redirect('/profile');
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).send(`
      <h1>Update Failed</h1>
      <p>${error.message}</p>
      <a href="/profile">← Back to Profile</a>
    `);
  }
});

export default router;