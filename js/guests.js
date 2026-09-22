/* ==========================================================
   WEDORA – Guests JS
   Talks to /php/guests.php via Fetch API
   ========================================================== */

const API = 'php/guests.php';
// The logged-in user is resolved server-side from the PHP session
// (see php/guests.php -> getSessionUserId()). No user id is ever
// sent from the client.

/* ── DOM refs ── */
const searchInput   = document.getElementById('searchInput');
const filterSide    = document.getElementById('filterSide');
const filterStatus  = document.getElementById('filterStatus');
const filterCategory= document.getElementById('filterCategory');
const tableBody     = document.getElementById('guestTableBody');

const countTotal       = document.getElementById('countTotal');
const countConfirmed   = document.getElementById('countConfirmed');
const countPending     = document.getElementById('countPending');
const countNotAttending= document.getElementById('countNotAttending');

// Guest modal
const guestModal   = document.getElementById('guestModal');
const guestForm    = document.getElementById('guestForm');
const modalTitle   = document.getElementById('modalTitle');
const guestId      = document.getElementById('guestId');
const fieldName    = document.getElementById('fieldName');
const fieldPhone   = document.getElementById('fieldPhone');
const fieldEmail   = document.getElementById('fieldEmail');
const fieldSide    = document.getElementById('fieldSide');
const fieldCategory= document.getElementById('fieldCategory');
const fieldInvitation = document.getElementById('fieldInvitation');
const fieldRsvp    = document.getElementById('fieldRsvp');
const fieldNotes   = document.getElementById('fieldNotes');
const formAlert    = document.getElementById('formAlert');
const saveBtn      = document.getElementById('saveBtn');

// Delete modal
const deleteModal      = document.getElementById('deleteModal');
const deleteGuestName  = document.getElementById('deleteGuestName');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Toast
const toast = document.getElementById('toast');

/* ══════════════════════════════════════════════
   LOAD / FETCH
══════════════════════════════════════════════ */
async function loadGuests() {
  tableBody.innerHTML = '<tr class="loading-row"><td colspan="6">Loading guests…</td></tr>';

  const params = new URLSearchParams({
    action:   'list',
    search:   searchInput.value.trim(),
    side:     filterSide.value,
    status:   filterStatus.value,
    category: filterCategory.value,
  });

  try {
    const res  = await fetch(`${API}?${params}`);

    if (res.status === 401) {
      // Session expired or user never logged in — send them to login.
      window.location.href = 'login.html';
      return;
    }

    const data = await res.json();

    if (!data.success) throw new Error(data.message || 'Failed to load.');

    // Update counts
    const c = data.counts;
    countTotal.textContent        = c.total        ?? 0;
    countConfirmed.textContent    = c.confirmed     ?? 0;
    countPending.textContent      = c.pending       ?? 0;
    countNotAttending.textContent = c.not_attending ?? 0;

    renderTable(data.guests);
  } catch (err) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="6">⚠ ${err.message}</td></tr>`;
    showToast(err.message, 'error');
  }
}

/* ══════════════════════════════════════════════
   RENDER TABLE
══════════════════════════════════════════════ */
function renderTable(guests) {
  if (!guests.length) {
    tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No guests found.</td></tr>';
    return;
  }

  tableBody.innerHTML = guests.map(g => `
    <tr data-id="${g.id}">
      <td>${escHtml(g.name)}</td>
      <td>${escHtml(g.side)}</td>
      <td>${escHtml(g.category)}</td>
      <td>${escHtml(g.invitation)}</td>
      <td>${rsvpBadge(g.rsvp)}</td>
      <td>
        <div class="action-btns">
          <button class="act-btn act-edit"   title="Edit"   onclick="openEdit(${g.id})">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="act-btn act-delete" title="Delete" onclick="openDelete(${g.id}, '${escAttr(g.name)}')">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function rsvpBadge(rsvp) {
  const map = {
    'Confirmed':    '<span class="badge badge-confirmed">Confirmed</span>',
    'Pending':      '<span class="badge badge-pending">Pending</span>',
    'Not Attending':'<span class="badge badge-not">Not Attending</span>',
  };
  return map[rsvp] ?? rsvp;
}

/* ══════════════════════════════════════════════
   MODAL – ADD
══════════════════════════════════════════════ */
document.getElementById('addGuestBtn').addEventListener('click', () => {
  guestId.value = '';
  guestForm.reset();
  formAlert.className = 'form-alert';
  formAlert.textContent = '';
  document.getElementById('errName').textContent = '';
  modalTitle.textContent = 'Add Guest';
  saveBtn.textContent = 'Save Guest';
  openModal(guestModal);
});

/* ══════════════════════════════════════════════
   MODAL – EDIT
══════════════════════════════════════════════ */
let _guestCache = {};

async function openEdit(id) {
  // fetch fresh data
  try {
    const res  = await fetch(`${API}?action=list`);
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    const data = await res.json();
    const guest = data.guests.find(g => +g.id === +id);
    if (!guest) { showToast('Guest not found.', 'error'); return; }

    guestId.value           = guest.id;
    fieldName.value         = guest.name;
    fieldPhone.value        = guest.phone  ?? '';
    fieldEmail.value        = guest.email  ?? '';
    fieldSide.value         = guest.side;
    fieldCategory.value     = guest.category;
    fieldInvitation.value   = guest.invitation;
    fieldRsvp.value         = guest.rsvp;
    fieldNotes.value        = guest.notes  ?? '';
    formAlert.className = 'form-alert';
    formAlert.textContent = '';
    document.getElementById('errName').textContent = '';
    modalTitle.textContent = 'Edit Guest';
    saveBtn.textContent = 'Update Guest';
    openModal(guestModal);
  } catch (err) {
    showToast('Could not load guest data.', 'error');
  }
}

/* ══════════════════════════════════════════════
   FORM SUBMIT (ADD / UPDATE)
══════════════════════════════════════════════ */
guestForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  document.getElementById('errName').textContent = '';
  if (!fieldName.value.trim()) {
    document.getElementById('errName').textContent = 'Name is required.';
    fieldName.focus();
    return;
  }

  const payload = {
    name:       fieldName.value.trim(),
    phone:      fieldPhone.value.trim(),
    email:      fieldEmail.value.trim(),
    side:       fieldSide.value,
    category:   fieldCategory.value,
    invitation: fieldInvitation.value,
    rsvp:       fieldRsvp.value,
    notes:      fieldNotes.value.trim(),
  };

  const isEdit = !!guestId.value;
  const url    = isEdit
    ? `${API}?action=update&id=${guestId.value}`
    : `${API}?action=add`;
  const method = isEdit ? 'PUT' : 'POST';

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (res.status === 401) { window.location.href = 'login.html'; return; }

    const data = await res.json();

    if (!data.success) throw new Error(data.message || 'Save failed.');

    showToast(isEdit ? 'Guest updated!' : 'Guest added!', 'success');
    closeModal(guestModal);
    loadGuests();
  } catch (err) {
    formAlert.className = 'form-alert is-error';
    formAlert.textContent = err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = isEdit ? 'Update Guest' : 'Save Guest';
  }
});

/* ══════════════════════════════════════════════
   MODAL – DELETE
══════════════════════════════════════════════ */
let _deleteId = null;

function openDelete(id, name) {
  _deleteId = id;
  deleteGuestName.textContent = name;
  openModal(deleteModal);
}

confirmDeleteBtn.addEventListener('click', async () => {
  if (!_deleteId) return;
  confirmDeleteBtn.disabled = true;

  try {
    const res  = await fetch(`${API}?action=delete&id=${_deleteId}`, { method: 'DELETE' });

    if (res.status === 401) { window.location.href = 'login.html'; return; }

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Delete failed.');

    showToast('Guest removed.', 'success');
    closeModal(deleteModal);
    loadGuests();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    _deleteId = null;
  }
});

/* ══════════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════════ */
function openModal(el)  { el.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
function closeModal(el) { el.classList.remove('is-open'); document.body.style.overflow = ''; }

document.getElementById('modalCloseBtn').addEventListener('click',  () => closeModal(guestModal));
document.getElementById('cancelBtn').addEventListener('click',       () => closeModal(guestModal));
document.getElementById('deleteCloseBtn').addEventListener('click',  () => closeModal(deleteModal));
document.getElementById('deleteCancelBtn').addEventListener('click', () => closeModal(deleteModal));

// Close on backdrop click
[guestModal, deleteModal].forEach(m => m.addEventListener('click', e => {
  if (e.target === m) closeModal(m);
}));

/* ══════════════════════════════════════════════
   FILTERS – debounce search
══════════════════════════════════════════════ */
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadGuests, 320);
});
[filterSide, filterStatus, filterCategory].forEach(el => el.addEventListener('change', loadGuests));

/* ══════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════ */
let toastTimer;
function showToast(msg, type = 'success') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 3200);
}

/* ══════════════════════════════════════════════
   LOGOUT
══════════════════════════════════════════════ */
document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (!confirm('Log out of Wedora?')) return;
  try {
    await fetch('php/logout.php', { method: 'POST' });
  } catch (_) {
    // Even if the request fails, still send the user to the login page.
  }
  window.location.href = 'login.html';
});

/* ══════════════════════════════════════════════
   XSS HELPERS
══════════════════════════════════════════════ */
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return String(s ?? '').replace(/'/g,"\\'");
}

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
loadGuests();
