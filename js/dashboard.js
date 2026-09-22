/* ==========================================================
   WEDORA - Dashboard page logic
   Pulls live data from php/dashboard_data.php (MySQL backed)
   and renders it into the page. Redirects to login if the
   user isn't authenticated.
   ========================================================== */
(() => {
  'use strict';

  const statusEl = document.getElementById('dashStatus');
  const bodyEl   = document.getElementById('dashBody');

  function show(el) { el.style.display = ''; }
  function hide(el) { el.style.display = 'none'; }

  async function loadDashboard() {
    try {
      const res = await fetch('php/dashboard_data.php', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
      });

      if (res.status === 401) {
        window.location.href = 'login.html';
        return;
      }

      const data = await res.json();

      if (!data.success) {
        statusEl.textContent = data.message || 'Could not load your dashboard.';
        return;
      }

      render(data);
      hide(statusEl);
      show(bodyEl);
    } catch (err) {
      statusEl.textContent = 'Could not reach the server. Make sure Apache and MySQL are running, then refresh the page.';
    }
  }

  function render(data) {
    document.getElementById('coupleName').textContent = data.user.couple_name + ' 💕';
    document.getElementById('weddingDate').textContent = data.wedding.date;
    document.getElementById('daysToGo').textContent =
      data.wedding.days_to_go === null ? '—' : data.wedding.days_to_go;

    /* ---- Tasks stat card ---- */
    const s = data.stats;
    document.getElementById('tasksValue').textContent = `${s.tasks_done} / ${s.tasks_total}`;
    document.getElementById('tasksBar').style.width = `${s.tasks_progress}%`;
    document.getElementById('tasksPct').textContent = `${s.tasks_progress}%`;

    /* ---- Budget stat card ---- */
    document.getElementById('budgetSpentValue').textContent = s.budget_spent;
    document.getElementById('budgetBar').style.width = `${s.budget_pct}%`;
    document.getElementById('budgetCaption').textContent = `${s.budget_pct}% of Rs ${s.budget_total}`;
    document.getElementById('budgetPct').textContent = `${s.budget_pct}%`;

    /* ---- Guests / Vendors stat cards ---- */
    document.getElementById('guestsValue').textContent = s.guests_confirmed;
    document.getElementById('vendorsValue').textContent = s.vendors_saved;

    /* ---- Upcoming tasks list ---- */
    const taskList = document.getElementById('taskList');
    if (data.upcoming_tasks.length === 0) {
      taskList.innerHTML = '<p class="empty-note">No upcoming tasks — you\'re all caught up!</p>';
    } else {
      taskList.innerHTML = data.upcoming_tasks.map((t) => `
        <div class="task-row">
          <span class="task-dot"></span>
          <span class="task-title">${escapeHtml(t.title)}</span>
          <span class="task-date">${escapeHtml(t.due_date)}</span>
        </div>
      `).join('');
    }

    /* ---- Budget overview donut ---- */
    const bo = data.budget_overview;
    const pct = Math.min(Math.max(bo.spent_pct, 0), 100);
    const donut = document.getElementById('donutChart');
    donut.style.background =
      `conic-gradient(var(--maroon) 0% ${pct}%, #f2c9cf ${pct}% 100%)`;
    document.getElementById('donutSpent').textContent = bo.spent.replace('Rs. ', '');
    document.getElementById('legendTotal').textContent = bo.total;
    document.getElementById('legendSpent').textContent = bo.spent;
    document.getElementById('legendRemaining').textContent = bo.remaining;

    /* ---- Upcoming payments ---- */
    const paymentsList = document.getElementById('paymentsList');
    if (data.upcoming_payments.length === 0) {
      paymentsList.innerHTML = '<p class="empty-note">No upcoming payments.</p>';
    } else {
      paymentsList.innerHTML = data.upcoming_payments.map((p) => `
        <div class="payment-row">
          <span class="payment-name">${escapeHtml(p.name)}</span>
          <span class="payment-amount">${escapeHtml(p.amount)}</span>
          <span class="payment-date">${escapeHtml(p.due_date)}</span>
        </div>
      `).join('');
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  /* ---------- sidebar toggle (mobile) ---------- */
  const sidebar     = document.getElementById('sidebar');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  hamburgerBtn.addEventListener('click', () => {
    sidebar.classList.toggle('is-open');
  });

  /* ---------- logout ---------- */
  document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = 'php/logout.php';
  });

  loadDashboard();
})();
