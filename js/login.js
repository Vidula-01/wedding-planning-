/* ==========================================================
   WEDORA - Login page logic
   - validates email & password in the browser
   - sends the form to php/login.php with fetch()
   - handles Google & Facebook social login modal
   - handles Forgot Password modal
   ========================================================== */
(() => {
  'use strict';

  const ENDPOINT     = 'php/login.php';
  const REDIRECT_URL = 'dashboard.html'; // where to go after successful login
  const REDIRECT_DELAY = 1500;           // ms

  const form      = document.getElementById('loginForm');
  const alertBox  = document.getElementById('formAlert');
  const submitBtn = document.getElementById('loginBtn');
  const btnLabel  = submitBtn.querySelector('.btn-label');

  /* ---------- validation rules ---------- */
  const rules = {
    email(value) {
      const v = value.trim();
      if (!v) return 'Please enter your email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.';
      return '';
    },
    password(value) {
      if (!value) return 'Please enter your password.';
      if (value.length < 6) return 'Password must be at least 6 characters.';
      return '';
    }
  };

  /* ---------- helpers ---------- */
  function setError(name, message) {
    const input = form.elements[name];
    const out   = document.getElementById(`${name}-error`);
    if (!input || !out) return;
    out.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function validateField(name) {
    const input   = form.elements[name];
    const message = rules[name](input.value, input);
    setError(name, message);
    return message === '';
  }

  function validateAll() {
    let firstInvalid = null;
    Object.keys(rules).forEach((name) => {
      if (!validateField(name) && !firstInvalid) firstInvalid = form.elements[name];
    });
    if (firstInvalid) firstInvalid.focus();
    return firstInvalid === null;
  }

  function showAlert(message, type = 'error') {
    alertBox.className = 'form-alert' + (message ? ` is-${type}` : '');
    alertBox.textContent = message;
  }

  function setLoading(isLoading) {
    submitBtn.disabled   = isLoading;
    btnLabel.textContent = isLoading ? 'Logging in…' : 'Login';
  }

  /* ---------- live validation ---------- */
  Object.keys(rules).forEach((name) => {
    const input = form.elements[name];
    input.addEventListener('blur',  () => validateField(name));
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(name);
    });
  });

  /* ---------- show / hide password ---------- */
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const show  = input.type === 'password';
      input.type  = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  /* ---------- form submit ---------- */
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showAlert('');

    if (!validateAll()) return;

    setLoading(true);
    let loggedIn = false;

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      let data = null;
      try { data = await response.json(); } catch (_) { /* not JSON */ }
      if (!data) throw new Error('Unexpected server response');

      if (data.success) {
        loggedIn = true;
        showAlert(data.message || 'Login successful! Redirecting…', 'success');
        setTimeout(() => { window.location.href = REDIRECT_URL; }, REDIRECT_DELAY);
      } else {
        if (data.errors) {
          Object.entries(data.errors).forEach(([name, msg]) => setError(name, msg));
        }
        showAlert(data.message || 'Invalid email or password. Please try again.', 'error');
      }
    } catch (err) {
      showAlert('Could not reach the server. Make sure Apache and MySQL are running, then try again.', 'error');
    } finally {
      if (!loggedIn) setLoading(false);
    }
  });

  /* ==========================================================
     SOCIAL LOGIN MODAL (Google & Facebook)
     ========================================================== */
  const socialModal      = document.getElementById('socialModal');
  const closeSocialModal = document.getElementById('closeSocialModal');
  const modalTitle       = document.getElementById('socialModalTitle');
  const modalSubtitle    = document.getElementById('socialModalSubtitle');
  const modalProviderIcon= document.getElementById('modalProviderIcon');
  const accountsList     = document.getElementById('socialAccountsList');
  const customSocialForm = document.getElementById('customSocialForm');
  const socialAlert      = document.getElementById('socialAlert');
  const btnSocialSubmit  = document.getElementById('btnSocialSubmit');
  const footerProvider   = document.getElementById('footerProviderName');

  let activeProvider = 'google';

  const socialPresets = {
    google: {
      name: 'Google',
      title: 'Sign in with Google',
      subtitle: 'Choose an account to login to WEDORA',
      icon: `<svg viewBox="0 0 48 48" width="20" height="20">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>`,
      accounts: [
        { name: 'Kavya Perera',    email: 'kavya.perera@gmail.com',    avatar: 'K' },
        { name: 'Sahan Fernando',  email: 'sahan.fernando@gmail.com',  avatar: 'S' }
      ]
    },
    facebook: {
      name: 'Facebook',
      title: 'Log in with Facebook',
      subtitle: 'Continue to WEDORA with Facebook',
      icon: `<svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
      </svg>`,
      accounts: [
        { name: 'Kavya Perera',      email: 'kavya.perera@facebook.com',  avatar: 'K' },
        { name: 'Dulan Jayawardena', email: 'dulan.j@facebook.com',       avatar: 'D' }
      ]
    }
  };

  function openSocialModal(provider) {
    activeProvider = provider;
    const config   = socialPresets[provider] || socialPresets.google;

    modalTitle.textContent       = config.title;
    modalSubtitle.textContent    = config.subtitle;
    modalProviderIcon.innerHTML  = config.icon;
    footerProvider.textContent   = config.name;
    document.querySelector('.social-submit-text').textContent = `Continue with ${config.name}`;

    accountsList.innerHTML = config.accounts.map((acc) => `
      <button type="button" class="social-account-item" data-name="${acc.name}" data-email="${acc.email}">
        <div class="account-avatar">${acc.avatar}</div>
        <div class="account-info">
          <div class="account-name">${acc.name}</div>
          <div class="account-email">${acc.email}</div>
        </div>
        <div class="account-badge">One-Click</div>
      </button>
    `).join('');

    accountsList.querySelectorAll('.social-account-item').forEach((item) => {
      item.addEventListener('click', () => {
        executeSocialLogin(activeProvider, item.dataset.email);
      });
    });

    customSocialForm.reset();
    showSocialAlert('');
    btnSocialSubmit.disabled = false;
    socialModal.classList.add('is-open');
    socialModal.setAttribute('aria-hidden', 'false');
  }

  function hideSocialModal() {
    socialModal.classList.remove('is-open');
    socialModal.setAttribute('aria-hidden', 'true');
  }

  function showSocialAlert(message, type = 'error') {
    if (!message) {
      socialAlert.style.display = 'none';
      socialAlert.className     = 'social-alert';
      socialAlert.textContent   = '';
      return;
    }
    socialAlert.style.display = 'block';
    socialAlert.className     = `social-alert is-${type}`;
    socialAlert.textContent   = message;
  }

  async function executeSocialLogin(provider, email) {
    showSocialAlert('Connecting with ' + provider + '…', 'success');
    btnSocialSubmit.disabled = true;

    try {
      const formData = new FormData();
      formData.append('provider', provider);
      formData.append('email', email);

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        showSocialAlert(data.message || 'Login successful!', 'success');
        showAlert(data.message || 'Login successful!', 'success');
        setTimeout(() => {
          hideSocialModal();
          window.location.href = REDIRECT_URL;
        }, 1200);
      } else {
        showSocialAlert(data.message || 'Login failed. Please try again.', 'error');
        btnSocialSubmit.disabled = false;
      }
    } catch (err) {
      showSocialAlert('Connection error. Please check Apache / MySQL and try again.', 'error');
      btnSocialSubmit.disabled = false;
    }
  }

  document.querySelectorAll('.btn-social').forEach((btn) => {
    btn.addEventListener('click', () => openSocialModal(btn.dataset.provider));
  });

  closeSocialModal.addEventListener('click', hideSocialModal);
  socialModal.addEventListener('click', (e) => {
    if (e.target === socialModal) hideSocialModal();
  });

  customSocialForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('social_email');
    const email      = emailInput.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showSocialAlert('Please enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }
    executeSocialLogin(activeProvider, email);
  });

  /* ==========================================================
     FORGOT PASSWORD MODAL
     ========================================================== */
  const forgotModal   = document.getElementById('forgotModal');
  const closeForgot   = document.getElementById('closeForgotModal');
  const forgotForm    = document.getElementById('forgotForm');
  const forgotAlert   = document.getElementById('forgotAlert');
  const btnForgot     = document.getElementById('btnForgotSubmit');
  const forgotLink    = document.getElementById('forgotPasswordLink');

  function showForgotAlert(message, type = 'error') {
    if (!message) {
      forgotAlert.style.display = 'none';
      forgotAlert.className     = 'social-alert';
      forgotAlert.textContent   = '';
      return;
    }
    forgotAlert.style.display = 'block';
    forgotAlert.className     = `social-alert is-${type}`;
    forgotAlert.textContent   = message;
  }

  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotForm.reset();
    showForgotAlert('');
    btnForgot.disabled = false;
    forgotModal.classList.add('is-open');
    forgotModal.setAttribute('aria-hidden', 'false');
  });

  closeForgot.addEventListener('click', () => {
    forgotModal.classList.remove('is-open');
    forgotModal.setAttribute('aria-hidden', 'true');
  });

  forgotModal.addEventListener('click', (e) => {
    if (e.target === forgotModal) {
      forgotModal.classList.remove('is-open');
      forgotModal.setAttribute('aria-hidden', 'true');
    }
  });

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('forgot_email');
    const email      = emailInput.value.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      showForgotAlert('Please enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }

    btnForgot.disabled = true;
    showForgotAlert('Sending reset link…', 'success');

    /* ---- Simulate server response (replace with real fetch if needed) ---- */
    setTimeout(() => {
      showForgotAlert(`A reset link has been sent to ${email}. Please check your inbox.`, 'success');
    }, 1200);
  });

})();
