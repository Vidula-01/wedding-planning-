/* ==========================================================
   WEDORA - Vendors page logic
   Fetches vendors from php/vendors_api.php (MySQL backed)
   and handles search, category filter tabs, add/edit/delete.
   ========================================================== */

(function () {
  'use strict';

  const API_URL = 'php/vendors_api.php';

  const tableBody      = document.getElementById('vendorTableBody');
  const searchInput    = document.getElementById('searchInput');
  const categoryTabs   = document.getElementById('categoryTabs');
  const openAddModalBtn = document.getElementById('openAddModal');

  const vendorModal      = document.getElementById('vendorModal');
  const vendorModalTitle = document.getElementById('vendorModalTitle');
  const vendorForm       = document.getElementById('vendorForm');
  const vendorIdInput    = document.getElementById('vendorId');
  const vendorFormAlert  = document.getElementById('vendorFormAlert');
  const cancelVendorBtn  = document.getElementById('cancelVendorModal');
  const saveVendorBtn    = document.getElementById('saveVendorBtn');

  const viewModal     = document.getElementById('viewModal');
  const viewModalBody = document.getElementById('viewModalBody');
  const closeViewBtn  = document.getElementById('closeViewModal');

  // "Others" tab is a catch-all: it shows every vendor whose category
  // isn't one of the other named tabs (e.g. Videography).
  const NAMED_TAB_CATEGORIES = ['Photography', 'Venue', 'Catering', 'Decorations', 'Florist'];

  let allVendors = [];
  let activeCategory = 'All';
  let activeSearch = '';

  /* ---------------------------------------------------- */
  /* Fetch + render                                        */
  /* ---------------------------------------------------- */
  async function loadVendors() {
    tableBody.innerHTML = '<tr><td colspan="5" class="table-loading">Loading vendors…</td></tr>';
    try {
      const res = await fetch(`${API_URL}?action=list`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not load vendors.');
      allVendors = data.vendors || [];
      renderTable();
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="5" class="table-empty">Could not load vendors. ${escapeHtml(err.message || '')}</td></tr>`;
    }
  }

  function matchesActiveCategory(vendor) {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Others') {
      return !NAMED_TAB_CATEGORIES.includes(vendor.category);
    }
    return vendor.category === activeCategory;
  }

  function matchesSearch(vendor) {
    if (!activeSearch) return true;
    const term = activeSearch.toLowerCase();
    return (
      vendor.name.toLowerCase().includes(term) ||
      vendor.category.toLowerCase().includes(term) ||
      vendor.contact.toLowerCase().includes(term)
    );
  }

  function renderTable() {
    const filtered = allVendors.filter((v) => matchesActiveCategory(v) && matchesSearch(v));

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="table-empty">No vendors found.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map(rowTemplate).join('');

    tableBody.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => openViewModal(btn.dataset.view));
    });
    tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.edit));
    });
    tableBody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteVendor(btn.dataset.delete, btn.dataset.name));
    });
  }

  function rowTemplate(vendor) {
    return `
      <tr>
        <td class="vendor-name">${escapeHtml(vendor.name)}</td>
        <td>${escapeHtml(vendor.category)}</td>
        <td>${escapeHtml(vendor.contact)}</td>
        <td>${formatPrice(vendor.price)}</td>
        <td>
          <div class="action-icons">
            <button type="button" class="icon-view" data-view="${vendor.id}" aria-label="View ${escapeHtml(vendor.name)}">
              <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button type="button" class="icon-edit" data-edit="${vendor.id}" aria-label="Edit ${escapeHtml(vendor.name)}">
              <svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button type="button" class="icon-delete" data-delete="${vendor.id}" data-name="${escapeHtml(vendor.name)}" aria-label="Delete ${escapeHtml(vendor.name)}">
              <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }

  function formatPrice(price) {
    const n = Number(price) || 0;
    return n.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------------------------------------------------- */
  /* Search + category filter                              */
  /* ---------------------------------------------------- */
  searchInput.addEventListener('input', () => {
    activeSearch = searchInput.value.trim();
    renderTable();
  });

  categoryTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-pill');
    if (!btn) return;
    categoryTabs.querySelectorAll('.tab-pill').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.category;
    renderTable();
  });

  /* ---------------------------------------------------- */
  /* Add / Edit modal                                       */
  /* ---------------------------------------------------- */
  function openModal(el) {
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
  }
  function closeModal(el) {
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  }

  function resetForm() {
    vendorForm.reset();
    vendorIdInput.value = '';
    vendorFormAlert.className = 'modal-alert';
    vendorFormAlert.textContent = '';
    vendorForm.querySelectorAll('.field-error').forEach((p) => (p.textContent = ''));
    vendorForm.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  }

  openAddModalBtn.addEventListener('click', () => {
    resetForm();
    vendorModalTitle.textContent = 'Add Vendor';
    openModal(vendorModal);
  });

  cancelVendorBtn.addEventListener('click', () => closeModal(vendorModal));
  vendorModal.addEventListener('click', (e) => {
    if (e.target === vendorModal) closeModal(vendorModal);
  });

  function openEditModal(id) {
    const vendor = allVendors.find((v) => String(v.id) === String(id));
    if (!vendor) return;
    resetForm();
    vendorModalTitle.textContent = 'Edit Vendor';
    vendorIdInput.value = vendor.id;
    document.getElementById('vendorName').value = vendor.name;
    document.getElementById('vendorCategory').value = vendor.category;
    document.getElementById('vendorContact').value = vendor.contact;
    document.getElementById('vendorPrice').value = vendor.price;
    document.getElementById('vendorNotes').value = vendor.notes || '';
    openModal(vendorModal);
  }

  vendorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    vendorFormAlert.className = 'modal-alert';
    vendorFormAlert.textContent = '';
    vendorForm.querySelectorAll('.field-error').forEach((p) => (p.textContent = ''));

    const payload = {
      id: vendorIdInput.value || undefined,
      name: document.getElementById('vendorName').value.trim(),
      category: document.getElementById('vendorCategory').value,
      contact: document.getElementById('vendorContact').value.trim(),
      price: document.getElementById('vendorPrice').value,
      notes: document.getElementById('vendorNotes').value.trim(),
    };

    const isEdit = Boolean(payload.id);
    const action = isEdit ? 'update' : 'add';

    saveVendorBtn.disabled = true;
    saveVendorBtn.textContent = 'Saving…';

    try {
      const res = await fetch(`${API_URL}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.errors) {
          Object.entries(data.errors).forEach(([field, msg]) => {
            const el = document.getElementById(`err-${field}`);
            if (el) el.textContent = msg;
          });
        }
        vendorFormAlert.className = 'modal-alert is-error';
        vendorFormAlert.textContent = data.message || 'Something went wrong.';
        return;
      }

      closeModal(vendorModal);
      await loadVendors();
    } catch (err) {
      vendorFormAlert.className = 'modal-alert is-error';
      vendorFormAlert.textContent = 'Network error. Please try again.';
    } finally {
      saveVendorBtn.disabled = false;
      saveVendorBtn.textContent = 'Save Vendor';
    }
  });

  /* ---------------------------------------------------- */
  /* View modal                                             */
  /* ---------------------------------------------------- */
  function openViewModal(id) {
    const vendor = allVendors.find((v) => String(v.id) === String(id));
    if (!vendor) return;

    viewModalBody.innerHTML = `
      <div class="view-row"><span class="label">Vendor</span><span class="value">${escapeHtml(vendor.name)}</span></div>
      <div class="view-row"><span class="label">Category</span><span class="value">${escapeHtml(vendor.category)}</span></div>
      <div class="view-row"><span class="label">Contact</span><span class="value">${escapeHtml(vendor.contact)}</span></div>
      <div class="view-row"><span class="label">Price</span><span class="value">Rs. ${formatPrice(vendor.price)}</span></div>
      ${vendor.notes ? `<div class="view-row"><span class="label">Notes</span><span class="value">${escapeHtml(vendor.notes)}</span></div>` : ''}
    `;
    openModal(viewModal);
  }

  closeViewBtn.addEventListener('click', () => closeModal(viewModal));
  viewModal.addEventListener('click', (e) => {
    if (e.target === viewModal) closeModal(viewModal);
  });

  /* ---------------------------------------------------- */
  /* Delete                                                 */
  /* ---------------------------------------------------- */
  async function deleteVendor(id, name) {
    if (!confirm(`Remove "${name}" from your vendor list?`)) return;

    try {
      const res = await fetch(`${API_URL}?action=delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || 'Could not delete this vendor.');
        return;
      }
      await loadVendors();
    } catch (err) {
      alert('Network error. Please try again.');
    }
  }

  /* ---------------------------------------------------- */
  /* Logout                                                 */
  /* ---------------------------------------------------- */
  document.getElementById('logoutBtn').addEventListener('click', () => {
    window.location.href = 'login.html';
  });

  /* ---------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', loadVendors);
  if (document.readyState !== 'loading') loadVendors();
})();
