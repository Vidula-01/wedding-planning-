/* ==========================================================
   WEDORA - Profile page logic
   Loads the logged-in user's account + wedding details from
   php/profile_data.php, lets them edit every field, and saves
   changes back to MySQL via php/profile_update.php (and
   php/change_password.php for the password section).
   ========================================================== */
(() => {
  'use strict';

  const statusEl = document.getElementById('dashStatus');
  const bodyEl   = document.getElementById('dashBody');

  function show(el) { el.style.display = ''; }
  function hide(el) { el.style.display = 'none'; }

  function initials(fullName, partnerName) {
    const a = (fullName || '').trim().charAt(0);
    const b = (partnerName || '').trim().charAt(0);
    const combined = (a + b).toUpperCase();
    return combined || '—';
  }

  /* ---------- load current profile ---------- */
  async function loadProfile() {
    try {
      const res = await fetch('php/profile_data.php', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
      });

      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }

      const data = await res.json();

      if (!data.success) {
        statusEl.textContent = data.message || 'Could not load your profile.';
        return;
      }

      fillForm(data);
      hide(statusEl);
      show(bodyEl);
    } catch (err) {
      statusEl.textContent = 'Could not reach the server. Make sure Apache and MySQL are running, then refresh the page.';
    }
  }

  function fillForm(data) {
    const u = data.user;
    const w = data.wedding;

    document.getElementById('fullName').value = u.full_name || '';
    document.getElementById('email').value = u.email || '';
    document.getElementById('phone').value = u.phone || '';

    document.getElementById('partnerName').value = w.partner_name || '';
    document.getElementById('weddingDate').value = w.wedding_date || '';
    document.getElementById('totalBudget').value = w.total_budget || 0;
    document.getElementById('spentBudget').value = w.spent_budget || 0;
    document.getElementById('guestsConfirmed').value = w.guests_confirmed || 0;
    document.getElementById('vendorsSaved').value = w.vendors_saved || 0;

    document.getElementById('avatarInitials').textContent = initials(u.full_name, w.partner_name);
    document.getElementById('summaryName').textContent =
      w.partner_name ? `${u.full_name} & ${w.partner_name}` : u.full_name;
    document.getElementById('summaryEmail').textContent = u.email;
    document.getElementById('summaryMeta').textContent = `Member since ${u.member_since}`;
  }

  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
    form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
  }

  function applyErrors(form, errors) {
    Object.keys(errors || {}).forEach((key) => {
      const input = form.querySelector(`[name="${key}"]`);
      const errEl = document.getElementById('err_' + key);
      if (input) input.setAttribute('aria-invalid', 'true');
      if (errEl) errEl.textContent = errors[key];
    });
  }

  function setStatus(el, message, isError) {
    el.textContent = message;
    el.classList.remove('is-success', 'is-error');
    if (message) el.classList.add(isError ? 'is-error' : 'is-success');
  }

  /* ---------- save profile (account + wedding details) ---------- */
  const profileForm  = document.getElementById('profileForm');
  const saveBtn       = document.getElementById('saveProfileBtn');
  const profileStatus = document.getElementById('profileStatus');

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(profileForm);
    setStatus(profileStatus, '', false);
    saveBtn.disabled = true;

    const payload = {
      full_name:         document.getElementById('fullName').value.trim(),
      email:             document.getElementById('email').value.trim(),
      phone:             document.getElementById('phone').value.trim(),
      partner_name:      document.getElementById('partnerName').value.trim(),
      wedding_date:      document.getElementById('weddingDate').value,
      total_budget:      document.getElementById('totalBudget').value,
      spent_budget:      document.getElementById('spentBudget').value,
      guests_confirmed:  document.getElementById('guestsConfirmed').value,
      vendors_saved:     document.getElementById('vendorsSaved').value,
    };

    try {
      const res = await fetch('php/profile_update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }

      const data = await res.json();

      if (!data.success) {
        applyErrors(profileForm, data.errors);
        setStatus(profileStatus, data.message || 'Please fix the errors below.', true);
        return;
      }

      setStatus(profileStatus, data.message || 'Saved!', false);
      document.getElementById('avatarInitials').textContent =
        initials(payload.full_name, payload.partner_name);
      document.getElementById('summaryName').textContent =
        payload.partner_name ? `${payload.full_name} & ${payload.partner_name}` : payload.full_name;
      document.getElementById('summaryEmail').textContent = payload.email;
    } catch (err) {
      setStatus(profileStatus, 'Could not reach the server. Please try again.', true);
    } finally {
      saveBtn.disabled = false;
    }
  });

  /* ---------- change password ---------- */
  const passwordForm   = document.getElementById('passwordForm');
  const savePwBtn       = document.getElementById('savePasswordBtn');
  const passwordStatus  = document.getElementById('passwordStatus');

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(passwordForm);
    setStatus(passwordStatus, '', false);
    savePwBtn.disabled = true;

    const payload = {
      current_password: document.getElementById('currentPassword').value,
      new_password:      document.getElementById('newPassword').value,
      confirm_password:  document.getElementById('confirmPassword').value,
    };

    try {
      const res = await fetch('php/change_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }

      const data = await res.json();

      if (!data.success) {
        applyErrors(passwordForm, data.errors);
        setStatus(passwordStatus, data.message || 'Please fix the errors below.', true);
        return;
      }

      setStatus(passwordStatus, data.message || 'Password updated.', false);
      passwordForm.reset();
    } catch (err) {
      setStatus(passwordStatus, 'Could not reach the server. Please try again.', true);
    } finally {
      savePwBtn.disabled = false;
    }
  });

  /* ---------- sidebar toggle (mobile) ---------- */
  const sidebar      = document.getElementById('sidebar');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  hamburgerBtn.addEventListener('click', () => {
    sidebar.classList.toggle('is-open');
  });

  /* ---------- logout ---------- */
  document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = 'php/logout.php';
  });

  loadProfile();
})();
