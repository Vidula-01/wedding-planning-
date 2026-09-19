/* ==========================================================
   WEDORA - Register page logic
   - validates every field in the browser
   - sends the form to php/register.php with fetch()
   ========================================================== */
(() => {
  'use strict';

  const ENDPOINT = 'php/register.php';
  const REDIRECT_URL = 'login.html';   // where to go after a successful sign-up
  const REDIRECT_DELAY = 1800;         // ms

  const form      = document.getElementById('registerForm');
  const alertBox  = document.getElementById('formAlert');
  const submitBtn = document.getElementById('registerBtn');
  const btnLabel  = submitBtn.querySelector('.btn-label');

  /* ---------- validation rules (return '' when the value is OK) ---------- */
  const rules = {
    full_name(value) {
      const v = value.trim();
      if (!v) return 'Please enter your full name.';
      if (!/^[\p{L}][\p{L}\p{M}\s.'-]{1,99}$/u.test(v)) {
        return 'Use letters only, at least 2 characters.';
      }
      return '';
    },
    email(value) {
      const v = value.trim();
      if (!v) return 'Please enter your email address.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.';
      return '';
    },
    phone(value) {
      const digits = value.replace(/[\s\-()]/g, '');
      if (!digits) return 'Please enter your phone number.';
      if (!/^\+?\d{9,15}$/.test(digits)) return 'Enter a valid phone number, e.g. 0771234567.';
      return '';
    },
    password(value) {
      if (!value) return 'Please create a password.';
      if (value.length < 8) return 'Use at least 8 characters.';
      if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
        return 'Include at least one letter and one number.';
      }
      return '';
    },
    confirm_password(value) {
      if (!value) return 'Please confirm your password.';
      if (value !== form.elements.password.value) return 'Passwords do not match.';
      return '';
    },
    terms(_value, el) {
      return el.checked ? '' : 'Please accept the Terms of Service and Privacy Policy.';
    }
  };

  /* ---------- helpers ---------- */
  function setError(name, message) {
    const input = form.elements[name];
    const out = document.getElementById(`${name}-error`);
    if (!input || !out) return;
    out.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function validateField(name) {
    const input = form.elements[name];
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
    submitBtn.disabled = isLoading;
    btnLabel.textContent = isLoading ? 'Creating account…' : 'Register';
  }

  /* ---------- live validation ---------- */
  Object.keys(rules).forEach((name) => {
    const input = form.elements[name];
    const isCheckbox = input.type === 'checkbox';

    // check when the user leaves the field
    input.addEventListener(isCheckbox ? 'change' : 'blur', () => validateField(name));

    // once a field shows an error, re-check while typing so it clears quickly
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(name);
      if (name === 'password' && form.elements.confirm_password.value) {
        validateField('confirm_password');
      }
    });
  });

  /* ---------- show / hide password ---------- */
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(show));
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  /* ---------- Google & Facebook Social Registration Flow ---------- */
  const SOCIAL_ENDPOINT = 'php/social_register.php';
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
      subtitle: 'Choose an account to register with WEDORA',
      icon: `<svg viewBox="0 0 48 48" width="20" height="20">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>`,
      accounts: [
        { name: 'Kavya Perera', email: 'kavya.perera@gmail.com', avatar: 'K' },
        { name: 'Sahan Fernando', email: 'sahan.fernando@gmail.com', avatar: 'S' }
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
        { name: 'Kavya Perera', email: 'kavya.perera@facebook.com', avatar: 'K' },
        { name: 'Dulan Jayawardena', email: 'dulan.j@facebook.com', avatar: 'D' }
      ]
    }
  };

  function openSocialModal(provider) {
    activeProvider = provider;
    const config = socialPresets[provider] || socialPresets.google;

    modalTitle.textContent = config.title;
    modalSubtitle.textContent = config.subtitle;
    modalProviderIcon.innerHTML = config.icon;
    footerProvider.textContent = config.name;
    document.querySelector('.social-submit-text').textContent = `Continue with ${config.name}`;

    // Render Quick Account cards
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

    // Attach click event to each quick account card
    accountsList.querySelectorAll('.social-account-item').forEach((item) => {
      item.addEventListener('click', () => {
        executeSocialRegister(activeProvider, item.dataset.name, item.dataset.email);
      });
    });

    // Reset custom form & alerts
    customSocialForm.reset();
    showSocialAlert('');
    btnSocialSubmit.disabled = false;

    // Show modal
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
      socialAlert.className = 'social-alert';
      socialAlert.textContent = '';
      return;
    }
    socialAlert.style.display = 'block';
    socialAlert.className = `social-alert is-${type}`;
    socialAlert.textContent = message;
  }

  async function executeSocialRegister(provider, fullName, email) {
    showSocialAlert('Connecting with ' + provider + '…', 'success');
    btnSocialSubmit.disabled = true;

    try {
      const formData = new FormData();
      formData.append('provider', provider);
      formData.append('full_name', fullName);
      formData.append('email', email);

      const response = await fetch(SOCIAL_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        showSocialAlert(data.message, 'success');
        showAlert(data.message, 'success');
        setTimeout(() => {
          hideSocialModal();
          window.location.href = REDIRECT_URL;
        }, 1200);
      } else {
        showSocialAlert(data.message || 'Registration failed. Please try again.', 'error');
        btnSocialSubmit.disabled = false;
      }
    } catch (err) {
      showSocialAlert('Connection error. Please check Apache / MySQL and try again.', 'error');
      btnSocialSubmit.disabled = false;
    }
  }

  // Open modal on clicking Google or Facebook button
  document.querySelectorAll('.btn-social').forEach((btn) => {
    btn.addEventListener('click', () => {
      openSocialModal(btn.dataset.provider);
    });
  });

  // Close modal events
  closeSocialModal.addEventListener('click', hideSocialModal);
  socialModal.addEventListener('click', (e) => {
    if (e.target === socialModal) hideSocialModal();
  });

  // Handle custom social details submit
  customSocialForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('social_full_name');
    const emailInput = document.getElementById('social_email');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name) {
      showSocialAlert('Please enter your name.', 'error');
      nameInput.focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showSocialAlert('Please enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }

    executeSocialRegister(activeProvider, name, email);
  });

  /* ---------- submit ---------- */
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showAlert('');

    if (!validateAll()) return;

    setLoading(true);
    let registered = false;

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
        registered = true;
        form.reset();
        showAlert(data.message || 'Account created successfully!', 'success');
        setTimeout(() => { window.location.href = REDIRECT_URL; }, REDIRECT_DELAY);
      } else {
        if (data.errors) {
          Object.entries(data.errors).forEach(([name, msg]) => setError(name, msg));
        }
        showAlert(data.message || 'Something went wrong. Please try again.', 'error');
      }
    } catch (err) {
      showAlert('Could not reach the server. Make sure Apache and MySQL are running, then try again.', 'error');
    } finally {
      if (!registered) setLoading(false);
    }
  });
})();
