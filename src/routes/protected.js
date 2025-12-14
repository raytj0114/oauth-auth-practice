import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import UnifiedAuthService from '../auth/UnifiedAuthService.js';
import SessionManager from '../auth/SessionManager.js';

const router = express.Router();

// 保護されたルート
// プロフィール表示
router.get('/profile', requireAuth, async (req, res) => {
  try {
    // 常に最新のユーザー情報を取得
    const user = await UnifiedAuthService.getUserWithAuths(req.user.id);

    if (!user) {
      return res.status(404).render('error', {
        ...res.locals,
        title: 'User Not Found',
        errorCode: 404,
        message: 'Your user account could not be found.'
      });
    }

    const linkedProviders = user.linkedProviders || [];
 
    res.render('profile', {
      title: `Profile - ${user.username}`,
      user,
      linkedProviders,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('Profile page error:', error);
    res.status(500).render('error', {
      ...res.locals,
      title: 'Server Error',
      errorCode: 500,
      message: 'Failed to load profile page.'
    });
  }
});

// 設定更新
router.post('/profile/preferences', requireAuth, async (req, res) => {  
  try {
    const { theme } = req.body;

    console.log(`[Profile] Updating theme to: ${theme} for user: ${req.user.id}`);

    // バリデーション
    if (!['light', 'dark'].includes(theme)) {
      throw new Error('Invalid theme value');
    }
    
    // UserRepository を更新
    const updatedUser = await UnifiedAuthService.updatePreferences(req.user.id, { theme });
    
    // セッションも更新
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
      await SessionManager.updateUserData(sessionId, updatedUser);
    }
    
    console.log('[Profile] Theme updated successfully');
    
    // 成功メッセージ付きでリダイレクト
    res.redirect('/profile?success=Preferences updated successfully');
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).render('error', {
      ...res.locals,
      title: 'Update Failed',
      errorCode: 500,
      message: error.message
    });
  }
});

export default router;