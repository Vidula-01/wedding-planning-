/* ==========================================================
   WEDORA - Wedding Details page logic
   Loads the logged-in user's wedding details from
   php/wedding_details_data.php, lets them edit every field,
   and saves changes back to MySQL via
   php/wedding_details_update.php. Mirrors js/profile.js.
   ========================================================== */
(() => {
  'use strict';

  const statusEl = document.getElementById('dashStatus');
  const bodyEl   = document.getElementById('dashBody');

  function show(el) { el.style.display = ''; }
  function hide(el) { el.style.display = 'none'; }

  /* ---------- load current wedding details ---------- */
  async function loadWeddingDetails() {
    try {
      const res = await fetch('php/wedding_details_data.php', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
      });

      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }

      const data = await res.json();

      if (!data.success) {
        statusEl.textContent = data.message || 'Could not load your wedding details.';
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
    const w = data.wedding;

    document.getElementById('partnerName').value      = w.partner_name || '';
    document.getElementById('weddingDate').value       = w.wedding_date || '';
    document.getElementById('theme').value              = w.theme || '';
    document.getElementById('dressCode').value          = w.dress_code || '';
    document.getElementById('ceremonyVenue').value      = w.ceremony_venue || '';
    document.getElementById('ceremonyAddress').value    = w.ceremony_address || '';
    document.getElementById('ceremonyTime').value       = (w.ceremony_time || '').slice(0, 5);
    document.getElementById('receptionVenue').value     = w.reception_venue || '';
    document.getElementById('receptionAddress').value   = w.reception_address || '';
    document.getElementById('receptionDate').value      = w.reception_date || '';
    document.getElementById('receptionTime').value      = (w.reception_time || '').slice(0, 5);
    document.getElementById('notes').value               = w.notes || '';

    document.getElementById('summaryCoupleName').textContent = data.user.couple_name + ' 💕';
    document.getElementById('summaryWeddingDate').textContent = data.summary.wedding_date;
    document.getElementById('summaryDaysToGo').textContent =
      data.summary.days_to_go === null ? '—' : data.summary.days_to_go;
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

  /* ---------- save wedding details ---------- */
  const form    = document.getElementById('weddingDetailsForm');
  const saveBtn = document.getElementById('saveWeddingDetailsBtn');
  const statusMsg = document.getElementById('weddingDetailsStatus');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(form);
    setStatus(statusMsg, '', false);
    saveBtn.disabled = true;

    const payload = {
      partner_name:       document.getElementById('partnerName').value.trim(),
      wedding_date:        document.getElementById('weddingDate').value,
      theme:                document.getElementById('theme').value.trim(),
      dress_code:           document.getElementById('dressCode').value.trim(),
      ceremony_venue:       document.getElementById('ceremonyVenue').value.trim(),
      ceremony_address:     document.getElementById('ceremonyAddress').value.trim(),
      ceremony_time:        document.getElementById('ceremonyTime').value,
      reception_venue:      document.getElementById('receptionVenue').value.trim(),
      reception_address:    document.getElementById('receptionAddress').value.trim(),
      reception_date:       document.getElementById('receptionDate').value,
      reception_time:       document.getElementById('receptionTime').value,
      notes:                 document.getElementById('notes').value.trim(),
    };

    try {
      const res = await fetch('php/wedding_details_update.php', {
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
        applyErrors(form, data.errors);
        setStatus(statusMsg, data.message || 'Please fix the errors below.', true);
        return;
      }

      setStatus(statusMsg, data.message || 'Saved!', false);

      /* refresh the summary banner (couple name / countdown) without a full reload */
      loadWeddingDetails();
    } catch (err) {
      setStatus(statusMsg, 'Could not reach the server. Please try again.', true);
    } finally {
      saveBtn.disabled = false;
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

  loadWeddingDetails();
})();
