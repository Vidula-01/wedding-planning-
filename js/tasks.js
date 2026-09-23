/**
 * WEDORA - Tasks Page Logic
 * Interacts with php/tasks.php REST API
 */
(() => {
  'use strict';

  const API_ENDPOINT = 'php/tasks.php';

  // DOM Elements
  const tasksTableBody = document.getElementById('tasksTableBody');
  const filterTabs     = document.querySelectorAll('.filter-tab');
  const openAddModalBtn= document.getElementById('openAddModalBtn');
  const taskModal      = document.getElementById('taskModal');
  const closeModalBtn  = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const taskForm       = document.getElementById('taskForm');
  const modalTitle     = document.getElementById('modalTitle');
  const toastMsg       = document.getElementById('toastMsg');

  // State
  let currentFilter = 'All';
  let tasksData = [];

  // ==========================================================
  //  Toast Notification Helper
  // ==========================================================
  let toastTimer = null;
  function showToast(message) {
    if (!toastMsg) return;
    toastMsg.textContent = message;
    toastMsg.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastMsg.classList.remove('show');
    }, 2800);
  }

  // ==========================================================
  //  Fetch Tasks from Backend API
  // ==========================================================
  async function loadTasks() {
    try {
      let url = API_ENDPOINT;
      if (currentFilter && currentFilter !== 'All') {
        url += `?status=${encodeURIComponent(currentFilter)}`;
      }

      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        tasksData = result.data;
        renderTasks(tasksData);
      } else {
        renderEmpty('Failed to load tasks.');
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      renderEmpty('Unable to connect to the database. Ensure Apache and MySQL are running in XAMPP.');
    }
  }

  // ==========================================================
  //  Render Tasks into Table
  // ==========================================================
  function renderTasks(tasks) {
    if (!tasks || tasks.length === 0) {
      renderEmpty('No tasks found for this status.');
      return;
    }

    const html = tasks.map(task => {
      const isCompleted = (task.status || '').toLowerCase() === 'completed';
      const formattedDate = task.formatted_due_date || task.due_date || '-';

      // Action column matching screenshot:
      // If Completed -> green circle checkmark
      // If To Do or In Progress -> pencil edit icon + trash delete icon
      let actionHtml = '';
      if (isCompleted) {
        actionHtml = `
          <span class="icon-completed" title="Mark as To Do" data-action="toggle-status" data-id="${task.id}" data-current-status="${escapeHtml(task.status)}">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#347a2a" stroke-width="2" fill="#347a2a"/>
              <path d="M7 12.5l3.5 3.5 7-7" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        `;
      } else {
        actionHtml = `
          <div class="action-wrapper">
            <button type="button" class="btn-action-icon btn-edit" title="Edit Task" data-action="edit" data-id="${task.id}">
              <svg viewBox="0 0 24 24">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
            <button type="button" class="btn-action-icon btn-delete" title="Delete Task" data-action="delete" data-id="${task.id}">
              <svg viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        `;
      }

      return `
        <tr data-id="${task.id}">
          <td>${escapeHtml(task.title)}</td>
          <td>${escapeHtml(task.category || 'General')}</td>
          <td>${escapeHtml(formattedDate)}</td>
          <td>${escapeHtml(task.priority || 'Medium')}</td>
          <td>${escapeHtml(task.status || 'To Do')}</td>
          <td class="col-action">${actionHtml}</td>
        </tr>
      `;
    }).join('');

    tasksTableBody.innerHTML = html;
  }

  function renderEmpty(message) {
    tasksTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">${escapeHtml(message)}</td>
      </tr>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================
  //  Filter Tabs Handling
  // ==========================================================
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentFilter = tab.dataset.filter || 'All';
      loadTasks();
    });
  });

  // ==========================================================
  //  Modal Handling: Add & Edit Task
  // ==========================================================
  function openModal(isEdit = false, task = null) {
    modalTitle.textContent = isEdit ? 'Edit Task' : 'Add New Task';
    taskForm.reset();

    if (isEdit && task) {
      document.getElementById('taskId').value       = task.id;
      document.getElementById('taskTitle').value    = task.title || '';
      document.getElementById('taskCategory').value = task.category || '';
      document.getElementById('taskDueDate').value  = task.due_date || '';
      document.getElementById('taskPriority').value = task.priority || 'Medium';
      document.getElementById('taskStatus').value   = task.status || 'To Do';
      document.getElementById('taskNotes').value    = task.notes || '';
    } else {
      document.getElementById('taskId').value       = '';
      document.getElementById('taskPriority').value = 'Medium';
      document.getElementById('taskStatus').value   = 'To Do';
    }

    taskModal.classList.add('is-open');
    taskModal.setAttribute('aria-hidden', 'false');
    document.getElementById('taskTitle').focus();
  }

  function closeModal() {
    taskModal.classList.remove('is-open');
    taskModal.setAttribute('aria-hidden', 'true');
  }

  openAddModalBtn.addEventListener('click', () => openModal(false));
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);

  // Close modal on click outside container
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
      closeModal();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && taskModal.classList.contains('is-open')) {
      closeModal();
    }
  });

  // ==========================================================
  //  Form Submit: Create or Update Task
  // ==========================================================
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id       = document.getElementById('taskId').value;
    const title    = document.getElementById('taskTitle').value.trim();
    const category = document.getElementById('taskCategory').value.trim() || 'General';
    const dueDate  = document.getElementById('taskDueDate').value;
    const priority = document.getElementById('taskPriority').value;
    const status   = document.getElementById('taskStatus').value;
    const notes    = document.getElementById('taskNotes').value.trim();

    if (!title) {
      alert('Please enter a task title.');
      document.getElementById('taskTitle').focus();
      return;
    }

    const payload = {
      title,
      category,
      due_date: dueDate || null,
      priority,
      status,
      notes: notes || null
    };

    const isEdit = Boolean(id);
    const url    = isEdit ? `${API_ENDPOINT}?id=${encodeURIComponent(id)}` : API_ENDPOINT;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        closeModal();
        showToast(isEdit ? 'Task updated successfully' : 'Task added successfully');
        loadTasks();
      } else {
        alert(data.message || 'Error saving task.');
      }
    } catch (err) {
      console.error('Error saving task:', err);
      alert('Could not save task. Please check server connection.');
    }
  });

  // ==========================================================
  //  Table Actions: Edit, Delete, Toggle Status
  // ==========================================================
  tasksTableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id     = btn.dataset.id;
    const task   = tasksData.find(t => String(t.id) === String(id));

    if (action === 'edit' && task) {
      openModal(true, task);
    } else if (action === 'delete') {
      if (confirm(`Are you sure you want to delete "${task ? task.title : 'this task'}"?`)) {
        try {
          const res = await fetch(`${API_ENDPOINT}?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { 'Accept': 'application/json' }
          });
          const data = await res.json();
          if (data.success) {
            showToast('Task deleted');
            loadTasks();
          } else {
            alert(data.message || 'Could not delete task.');
          }
        } catch (err) {
          console.error('Error deleting task:', err);
          alert('Failed to delete task.');
        }
      }
    } else if (action === 'toggle-status' && task) {
      // Toggle Completed back to To Do
      const nextStatus = task.status === 'Completed' ? 'To Do' : 'Completed';
      try {
        const res = await fetch(`${API_ENDPOINT}?id=${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ status: nextStatus })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Task marked as ${nextStatus}`);
          loadTasks();
        }
      } catch (err) {
        console.error('Error toggling status:', err);
      }
    }
  });

  // ==========================================================
  //  Initial Load
  // ==========================================================
  loadTasks();

})();
