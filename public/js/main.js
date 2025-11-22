console.log('OAuth Practice App loaded');

// フォームのクライアント側バリデーション
document.addEventListener('DOMContentLoaded', () => {
  // Sign Up フォームのバリデーション
  const signupForm = document.querySelector('form[action="/local/signup"]');

  if (signupForm) {
    const usernameField = signupForm.querySelector('input[name="username"]');
    const passwordField = signupForm.querySelector('input[name="password"]');

    // ユーザー名のバリデーション
    if (usernameField) {
      usernameField.addEventListener('input', () => {
        if (usernameField.value.length > 0 && usernameField.value.length < 3) {
          usernameField.setCustomValidity('Username must be at least 3 characters');
        } else {
          usernameField.setCustomValidity('');
        }
      });
    }

    // パスワードのバリデーション
    if (passwordField) {
      passwordField.addEventListener('input', () => {
        if (passwordField.value.length > 0 && passwordField.value.length < 6) {
          passwordField.setCustomValidity('Password must be at least 6 characters');
        } else {
          passwordField.setCustomValidity('');
        }
      });
    }
  }

  // パスワード確認フィールド (将来の拡張用)
  const passwordField = document.querySelector('input[name="password"]');
  const confirmPasswordField = document.querySelector('input[name="confirmPassword"]');

  if (passwordField && confirmPasswordField) {
    confirmPasswordField.addEventListener('input', () => {
      if (passwordField.value !== confirmPasswordField.value) {
        confirmPasswordField.setCustomValidity('Passwords do not match');
      } else {
        confirmPasswordField.setCustomValidity('');
      }
    });
  }

  // フォーカス時のアニメーション
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement.classList.add('focused');
    });

    input.addEventListener('blur', () => {
      input.parentElement.classList.remove('focused');
    });
  });

  // テーマ変更時の確認
  const themeForm = document.querySelector('.preference-form');
  if (themeForm) {
    const themeSelect = themeForm.querySelector('select[name="theme"]');
    const originalTheme = themeSelect.value;

    themeForm.addEventListener('submit', (e) => {
      const newTheme = themeSelect.value;

      if (newTheme === originalTheme) {
        e.preventDefault();
        alert('Theme is already set to ' + newTheme);
        return false;
      }

      // 確認ダイアログ (オプション)
      // if (!confirm(`Change theme to ${newTheme}?`)) {
      //   e.preventDefault();
      //   return false;
      // }
    });

    // テーマのリアルタイムプレビュー (オプション)
    themeSelect.addEventListener('change', () => {
      const newTheme = themeSelect.value;
      console.log(`Theme preview: ${newTheme}`);

      // ここでプレビューのロジックを追加可能
      // document.body.classList.toggle('dark-theme', newTheme === 'dark');
    });
  }

  // Logout の確認
  const logoutForms = document.querySelectorAll('form[action="/auth/logout"]');
  logoutForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!confirm('Are you sure you want to logout?')) {
        e.preventDefault();
        return false;
      }
    });
  });

  // アニメーション: セクションのフェードイン
  const sections = document.querySelectorAll('.section');
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  sections.forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    section.style.transition = 'opacity 0.5s, transform 0.5s';
    observer.observe(section);
  });
});