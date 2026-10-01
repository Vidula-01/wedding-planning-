/** WEDORA – Budget page logic (talks to php/budget.php) */
(() => {
  'use strict';

  const API = 'php/budget.php';
  const CIRC = 2 * Math.PI * 80;

  const $ = (id) => document.getElementById(id);
  const body = $('budgetBody'), modal = $('expenseModal'), form = $('expenseForm'), toast = $('toastMsg');
  let items = [];

  const rs = (n) => (n < 0 ? '-Rs. ' : 'Rs. ') + Math.abs(Math.round(n)).toLocaleString('en-US');
  const num = (n) => Math.round(n).toLocaleString('en-US');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  let timer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  async function api(method, query = '', payload = null) {
    const res = await fetch(API + query, {
      method,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (res.status === 401) { window.location.href = 'login.html'; throw new Error('auth'); }
    return res.json();
  }

  function renderSummary(s) {
    $('totalBudget').textContent = rs(s.total_budget);
    $('totalSpent').textContent = rs(s.total_spent);
    $('remaining').textContent = rs(s.remaining);
    $('remaining').classList.toggle('over', s.remaining < 0);
    $('donutPct').textContent = s.percent_used + '%';
    $('donut').setAttribute('aria-label', s.percent_used + '% of the budget used');
    const used = Math.min(Math.max(s.percent_used, 0), 100) / 100 * CIRC;
    $('donutUsed').setAttribute('stroke-dasharray', `${used} ${CIRC}`);
  }

  const CHECK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#347a2a"/><path d="M7 12.5l3.5 3.5 7-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const EMPTY = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="#c0283a" stroke-width="1.6"/></svg>';
  const TRASH = '<svg viewBox="0 0 24 24" fill="#b82d1f"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zM5.5 9h13l-1 12h-11l-1-12z"/></svg>';

  function renderRows() {
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-row">No expenses yet. Use “+Add Expense” to start tracking your budget.</td></tr>';
      return;
    }
    body.innerHTML = items.map((it) => `
      <tr>
        <td>${esc(it.category)}</td>
        <td class="n">${num(it.estimated)}</td>
        <td class="n">${num(it.actual)}</td>
        <td class="c"><button type="button" class="paid-btn" data-action="paid" data-id="${it.id}"
            aria-label="${it.is_paid ? 'Mark ' + esc(it.category) + ' as unpaid' : 'Mark ' + esc(it.category) + ' as paid'}"
            aria-pressed="${it.is_paid}">${it.is_paid ? CHECK : EMPTY}</button></td>
        <td class="c"><button type="button" class="del-btn" data-action="delete" data-id="${it.id}"
            aria-label="Delete ${esc(it.category)}">${TRASH}</button></td>
      </tr>`).join('');
  }

  async function load() {
    try {
      const r = await api('GET');
      if (!r.success) throw new Error(r.message);
      items = r.data;
      renderRows();
      renderSummary(r.summary);
    } catch (e) {
      if (e.message === 'auth') return;
      body.innerHTML = `<tr><td colspan="5" class="empty-row">${esc(e.message || 'Unable to load the budget.')} Make sure Apache and MySQL are running in XAMPP.</td></tr>`;
    }
  }

  /* modal */
  const openModal = () => { form.reset(); modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); $('expCategory').focus(); };
  const closeModal = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); };
  $('openAddModalBtn').addEventListener('click', openModal);
  $('closeModalBtn').addEventListener('click', closeModal);
  $('cancelModalBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = $('expCategory').value.trim();
    if (!category) { showToast('Enter a category for the expense.'); $('expCategory').focus(); return; }
    try {
      const r = await api('POST', '', {
        category,
        estimated: Number($('expEstimated').value) || 0,
        actual: Number($('expActual').value) || 0,
        is_paid: $('expPaid').checked,
      });
      if (!r.success) { showToast(r.message || 'Could not save the expense.'); return; }
      closeModal();
      showToast('Expense added');
      load();
    } catch (err) { if (err.message !== 'auth') showToast('Could not reach the server.'); }
  });

  /* paid toggle + delete */
  body.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const it = items.find((x) => String(x.id) === id);
    if (!it) return;
    try {
      if (btn.dataset.action === 'paid') {
        await api('PUT', `?id=${encodeURIComponent(id)}`, { is_paid: !it.is_paid });
        showToast(it.is_paid ? 'Marked as unpaid' : 'Marked as paid');
      } else if (confirm(`Delete "${it.category}" from your budget?`)) {
        await api('DELETE', `?id=${encodeURIComponent(id)}`);
        showToast('Expense deleted');
      } else return;
      load();
    } catch (err) { if (err.message !== 'auth') showToast('Something went wrong. Try again.'); }
  });

  load();
})();
