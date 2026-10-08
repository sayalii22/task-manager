/**
 * Tasks View Logic: List View, Drag-and-Drop Kanban, Filtering, Sorting, Bulk Actions & Export
 */

let currentView = 'list'; // 'list' or 'kanban'
let currentFilters = {
  status: 'all',
  priority: 'all',
  category: 'all',
  dueFilter: '',
  search: '',
  sortBy: 'newest',
  page: 1,
  limit: 25,
};

let selectedTaskIds = new Set();
let cachedTasks = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (window.Auth) window.Auth.requireAuth();

  initTaskViewControls();
  initBulkBar();
  initTaskForm();
  await loadCategoriesFilter();
  await loadTasks();
});

// 1. Controls & Filter Listeners
function initTaskViewControls() {
  // View Switcher (List vs Kanban)
  const viewBtns = document.querySelectorAll('.view-toggle-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;

      const listViewContainer = document.getElementById('listViewContainer');
      const kanbanViewContainer = document.getElementById('kanbanViewContainer');

      if (currentView === 'kanban') {
        listViewContainer.style.display = 'none';
        kanbanViewContainer.style.display = 'grid';
        renderKanban(cachedTasks);
      } else {
        kanbanViewContainer.style.display = 'none';
        listViewContainer.style.display = 'flex';
        renderListView(cachedTasks);
      }
    });
  });

  // Search Input with Debounce
  const searchInput = document.getElementById('taskSearchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentFilters.search = e.target.value.trim();
        currentFilters.page = 1;
        loadTasks();
      }, 300);
    });
  }

  // Filter Dropdowns
  const statusFilter = document.getElementById('filterStatus');
  const priorityFilter = document.getElementById('filterPriority');
  const categoryFilter = document.getElementById('filterCategory');
  const dueFilter = document.getElementById('filterDue');
  const sortSelect = document.getElementById('selectSort');

  if (statusFilter) statusFilter.addEventListener('change', (e) => { currentFilters.status = e.target.value; currentFilters.page = 1; loadTasks(); });
  if (priorityFilter) priorityFilter.addEventListener('change', (e) => { currentFilters.priority = e.target.value; currentFilters.page = 1; loadTasks(); });
  if (categoryFilter) categoryFilter.addEventListener('change', (e) => { currentFilters.category = e.target.value; currentFilters.page = 1; loadTasks(); });
  if (dueFilter) dueFilter.addEventListener('change', (e) => { currentFilters.dueFilter = e.target.value; currentFilters.page = 1; loadTasks(); });
  if (sortSelect) sortSelect.addEventListener('change', (e) => { currentFilters.sortBy = e.target.value; loadTasks(); });

  // Export Buttons
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      window.open('/api/tasks/export?format=csv', '_blank');
    });
  }
  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', () => {
      window.open('/api/tasks/export?format=json', '_blank');
    });
  }
}

// 2. Load Categories for the Filter Bar
async function loadCategoriesFilter() {
  const select = document.getElementById('filterCategory');
  if (!select) return;

  try {
    const res = await window.API.categories.getAll();
    const categories = res.categories || [];
    select.innerHTML = '<option value="all">All Categories</option>' + categories.map(c => `
      <option value="${c.name}">${c.name}</option>
    `).join('');
  } catch (err) {
    console.error('Failed to load categories filter:', err);
  }
}

// 3. Main Task Fetcher
async function loadTasks() {
  const loadingIndicator = document.getElementById('tasksLoading');
  if (loadingIndicator) loadingIndicator.style.display = 'block';

  try {
    const res = await window.API.tasks.getAll(currentFilters);
    cachedTasks = res.tasks || [];

    if (currentView === 'kanban') {
      renderKanban(cachedTasks);
    } else {
      renderListView(cachedTasks);
    }

    renderPagination(res.page, res.totalPages, res.total);
    selectedTaskIds.clear();
    updateBulkBarState();

  } catch (err) {
    console.error('Failed to fetch tasks:', err);
    if (window.showToast) window.showToast('Could not fetch tasks.', 'error');
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }
}

// 4. Render List View
function renderListView(tasks) {
  const container = document.getElementById('tasksList');
  if (!container) return;

  if (tasks.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-strong);">
        <i class="fa-solid fa-list-check" style="font-size: 2.5rem; color: var(--primary); margin-bottom: 12px;"></i>
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 6px;">No tasks found</h3>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">Try adjusting your filters or search terms, or create a new task.</p>
        <button class="btn-primary" onclick="window.openCreateTaskModal()">
          <i class="fa-solid fa-plus"></i> Create Task
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map(t => {
    const isCompleted = t.status === 'completed';
    const dateInfo = window.formatDueDate(t.dueDate);
    const isSelected = selectedTaskIds.has(t._id);

    return `
      <div class="task-card ${isCompleted ? 'completed' : ''}" data-id="${t._id}">
        <input type="checkbox" class="task-select-box" ${isSelected ? 'checked' : ''} onchange="toggleSelectTask('${t._id}', this.checked)" style="width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer;" />
        
        <div class="task-checkbox ${isCompleted ? 'checked' : ''}" onclick="toggleStatus('${t._id}', '${isCompleted ? 'todo' : 'completed'}')">
          <i class="fa-solid fa-check"></i>
        </div>

        <div class="task-main">
          <div class="task-header-row">
            <span class="task-title" onclick="editTask('${t._id}')">${escapeHtml(t.title)}</span>
            <span class="badge badge-priority-${t.priority}">
              <i class="fa-solid fa-circle" style="font-size: 0.5rem;"></i> ${t.priority}
            </span>
            <span class="badge badge-category">${escapeHtml(t.category)}</span>
            <span class="badge badge-status badge-status-${t.status}">${t.status}</span>
          </div>

          ${t.description ? `<p class="task-desc">${escapeHtml(t.description)}</p>` : ''}

          <div class="task-meta-row">
            ${dateInfo ? `
              <span class="date-badge ${dateInfo.isOverdue ? 'overdue' : dateInfo.isDueToday ? 'due-today' : ''}">
                <i class="fa-regular fa-clock"></i> ${dateInfo.text}
              </span>
            ` : ''}

            ${t.tags && t.tags.length > 0 ? t.tags.map(tag => `<span class="tag-pill">#${escapeHtml(tag)}</span>`).join('') : ''}
          </div>
        </div>

        <div class="task-actions">
          <button class="btn-icon" title="Edit Task" onclick="editTask('${t._id}')">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon" title="Delete Task" onclick="deleteTaskPrompt('${t._id}')" style="color: var(--priority-urgent);">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 5. Render Drag-and-Drop Kanban Board
function renderKanban(tasks) {
  const dropzones = {
    todo: document.getElementById('kanbanDropTodo'),
    'in-progress': document.getElementById('kanbanDropProgress'),
    completed: document.getElementById('kanbanDropCompleted'),
  };

  const counts = {
    todo: document.getElementById('countTodo'),
    'in-progress': document.getElementById('countProgress'),
    completed: document.getElementById('countCompleted'),
  };

  // Clear dropzones
  Object.values(dropzones).forEach(dz => { if (dz) dz.innerHTML = ''; });

  const buckets = { todo: [], 'in-progress': [], completed: [] };

  tasks.forEach(t => {
    const status = buckets[t.status] ? t.status : 'todo';
    buckets[status].push(t);
  });

  // Update counts
  if (counts.todo) counts.todo.textContent = buckets.todo.length;
  if (counts['in-progress']) counts['in-progress'].textContent = buckets['in-progress'].length;
  if (counts.completed) counts.completed.textContent = buckets.completed.length;

  // Render cards in each column
  Object.keys(buckets).forEach(status => {
    const dz = dropzones[status];
    if (!dz) return;

    if (buckets[status].length === 0) {
      dz.innerHTML = `<div style="text-align: center; padding: 32px 16px; color: var(--text-tertiary); font-size: 0.85rem;">No tasks in this stage</div>`;
      return;
    }

    dz.innerHTML = buckets[status].map(t => {
      const dateInfo = window.formatDueDate(t.dueDate);
      return `
        <div class="kanban-card" draggable="true" data-id="${t._id}">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span class="badge badge-priority-${t.priority}">${t.priority}</span>
            <span class="badge badge-category" style="font-size: 0.7rem;">${escapeHtml(t.category)}</span>
          </div>

          <div style="font-weight: 600; font-size: 0.92rem; color: var(--text-primary); cursor: pointer;" onclick="editTask('${t._id}')">
            ${escapeHtml(t.title)}
          </div>

          ${t.description ? `<p style="font-size: 0.8rem; color: var(--text-secondary); -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(t.description)}</p>` : ''}

          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; color: var(--text-tertiary); margin-top: 4px;">
            ${dateInfo ? `<span class="${dateInfo.isOverdue ? 'date-badge overdue' : ''}"><i class="fa-regular fa-clock"></i> ${dateInfo.text}</span>` : '<span></span>'}
            <div style="display: flex; gap: 4px;">
              <button class="btn-icon" style="width: 24px; height: 24px; font-size: 0.75rem;" onclick="editTask('${t._id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="btn-icon" style="width: 24px; height: 24px; font-size: 0.75rem; color: var(--priority-urgent);" onclick="deleteTaskPrompt('${t._id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  });

  setupKanbanDragAndDrop();
}

// 6. Setup HTML5 Drag and Drop Handlers
function setupKanbanDragAndDrop() {
  const cards = document.querySelectorAll('.kanban-card');
  const dropzones = document.querySelectorAll('.kanban-dropzone');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dropzones.forEach(dz => dz.classList.remove('drag-over'));
    });
  });

  dropzones.forEach(dz => {
    dz.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      dz.classList.add('drag-over');
    });

    dz.addEventListener('dragleave', () => {
      dz.classList.remove('drag-over');
    });

    dz.addEventListener('drop', async (e) => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      const targetStatus = dz.dataset.status;

      if (!taskId || !targetStatus) return;

      try {
        await window.API.tasks.updateStatus(taskId, targetStatus);
        if (window.showToast) window.showToast(`Task moved to ${targetStatus}!`, 'success');
        await loadTasks();
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
      }
    });
  });
}

// 7. Bulk Operations Bar
function initBulkBar() {
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  const bulkCompleteBtn = document.getElementById('bulkCompleteBtn');
  const bulkClearBtn = document.getElementById('bulkClearBtn');

  if (bulkClearBtn) {
    bulkClearBtn.addEventListener('click', () => {
      selectedTaskIds.clear();
      document.querySelectorAll('.task-select-box').forEach(cb => { cb.checked = false; });
      updateBulkBarState();
    });
  }

  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', async () => {
      if (selectedTaskIds.size === 0) return;
      if (!confirm(`Are you sure you want to delete ${selectedTaskIds.size} selected tasks?`)) return;

      try {
        await window.API.tasks.bulk('delete', Array.from(selectedTaskIds));
        if (window.showToast) window.showToast('Selected tasks deleted.', 'success');
        selectedTaskIds.clear();
        await loadTasks();
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
      }
    });
  }

  if (bulkCompleteBtn) {
    bulkCompleteBtn.addEventListener('click', async () => {
      if (selectedTaskIds.size === 0) return;
      try {
        await window.API.tasks.bulk('status', Array.from(selectedTaskIds), 'completed');
        if (window.showToast) window.showToast('Selected tasks marked as completed.', 'success');
        selectedTaskIds.clear();
        await loadTasks();
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
      }
    });
  }
}

function toggleSelectTask(id, isSelected) {
  if (isSelected) {
    selectedTaskIds.add(id);
  } else {
    selectedTaskIds.delete(id);
  }
  updateBulkBarState();
}

function updateBulkBarState() {
  const bulkBar = document.getElementById('bulkActionsBar');
  const countSpan = document.getElementById('bulkSelectedCount');
  if (!bulkBar) return;

  if (selectedTaskIds.size > 0) {
    bulkBar.classList.add('active');
    if (countSpan) countSpan.textContent = `${selectedTaskIds.size} tasks selected`;
  } else {
    bulkBar.classList.remove('active');
  }
}

// 8. Pagination Controls
function renderPagination(currentPage, totalPages, totalCount) {
  const container = document.getElementById('paginationControls');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 20px; font-size: 0.88rem; color: var(--text-secondary);">
      <span>Showing Page ${currentPage} of ${totalPages} (${totalCount} total)</span>
      <div style="display: flex; gap: 8px;">
        <button class="btn-secondary" ${currentPage <= 1 ? 'disabled style="opacity: 0.5;"' : ''} onclick="changePage(${currentPage - 1})">
          <i class="fa-solid fa-chevron-left"></i> Previous
        </button>
        <button class="btn-secondary" ${currentPage >= totalPages ? 'disabled style="opacity: 0.5;"' : ''} onclick="changePage(${currentPage + 1})">
          Next <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    </div>
  `;
}

function changePage(page) {
  currentFilters.page = page;
  loadTasks();
}

// 9. Task Form Submission
function initTaskForm() {
  const form = document.getElementById('taskForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('modalTaskId').value;
    const title = document.getElementById('modalTaskTitle').value.trim();
    const description = document.getElementById('modalTaskDesc').value.trim();
    const category = document.getElementById('modalTaskCategory').value;
    const dueDate = document.getElementById('modalTaskDueDate').value;
    const status = document.getElementById('modalTaskStatus').value;

    const checkedPriority = form.querySelector('input[name="priority"]:checked');
    const priority = checkedPriority ? checkedPriority.value : 'medium';

    // Collect tags from pills
    const tagPills = form.querySelectorAll('.tag-badge-pill');
    const tags = Array.from(tagPills).map(p => p.textContent.replace(/[\n#\s]/g, '').trim()).filter(Boolean);

    if (!title) {
      if (window.showToast) window.showToast('Please provide a task title.', 'error');
      return;
    }

    const payload = {
      title,
      description,
      category,
      priority,
      status,
      dueDate: dueDate || null,
      tags,
    };

    try {
      if (id) {
        await window.API.tasks.update(id, payload);
        if (window.showToast) window.showToast('Task updated successfully!', 'success');
      } else {
        await window.API.tasks.create(payload);
        if (window.showToast) window.showToast('Task created successfully!', 'success');
      }

      document.getElementById('taskModal').classList.remove('active');
      await loadTasks();

      // Trigger global event so dashboard/notifs update
      window.dispatchEvent(new CustomEvent('taskUpdated'));
    } catch (err) {
      if (window.showToast) window.showToast(err.message, 'error');
    }
  });
}

// 10. Actions & Helpers
async function toggleStatus(id, newStatus) {
  try {
    await window.API.tasks.updateStatus(id, newStatus);
    await loadTasks();
    window.dispatchEvent(new CustomEvent('taskUpdated'));
  } catch (err) {
    if (window.showToast) window.showToast(err.message, 'error');
  }
}

async function editTask(id) {
  const task = cachedTasks.find(t => t._id === id);
  if (!task) return;
  window.openCreateTaskModal({
    id: task._id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    category: task.category,
    dueDate: task.dueDate,
    tags: task.tags,
  });
}

async function deleteTaskPrompt(id) {
  if (!confirm('Are you sure you want to permanently delete this task?')) return;
  try {
    await window.API.tasks.delete(id);
    if (window.showToast) window.showToast('Task deleted.', 'success');
    await loadTasks();
    window.dispatchEvent(new CustomEvent('taskUpdated'));
  } catch (err) {
    if (window.showToast) window.showToast(err.message, 'error');
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.toggleSelectTask = toggleSelectTask;
window.toggleStatus = toggleStatus;
window.editTask = editTask;
window.deleteTaskPrompt = deleteTaskPrompt;
window.changePage = changePage;
