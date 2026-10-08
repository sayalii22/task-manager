/**
 * Shared Application UI Logic: Themes, Navigation, Notifications, Global Modals
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initUserProfile();
  initSidebar();
  initNotifications();
  initGlobalTaskModal();
});

// 1. Theme Toggle Management
function initTheme() {
  const savedTheme = localStorage.getItem('tm_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const themeToggles = document.querySelectorAll('.theme-toggle-btn');
  themeToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('tm_theme', nextTheme);
      updateThemeIcon(nextTheme);
    });
  });
}

function updateThemeIcon(theme) {
  const icons = document.querySelectorAll('.theme-toggle-btn i');
  icons.forEach(icon => {
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
    } else {
      icon.className = 'fa-solid fa-moon';
    }
  });
}

// 2. User Profile Population
function initUserProfile() {
  if (!window.Auth) return;
  const user = window.Auth.getUser();
  if (!user) return;

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  document.querySelectorAll('.user-avatar-text').forEach(el => {
    el.textContent = initials;
  });

  document.querySelectorAll('.user-avatar').forEach(el => {
    if (user.avatarColor) el.style.backgroundColor = user.avatarColor;
  });

  document.querySelectorAll('.user-name').forEach(el => {
    el.textContent = user.name || 'User';
  });

  document.querySelectorAll('.user-email').forEach(el => {
    el.textContent = user.email || '';
  });

  // Logout button bindings
  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.Auth.logout();
    });
  });
}

// 3. Mobile Sidebar Toggle
function initSidebar() {
  const sidebar = document.querySelector('.app-sidebar');
  const toggleBtn = document.querySelector('.sidebar-toggle-btn');
  if (!sidebar || !toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (
      sidebar.classList.contains('mobile-open') &&
      !sidebar.contains(e.target) &&
      !toggleBtn.contains(e.target)
    ) {
      sidebar.classList.remove('mobile-open');
    }
  });
}

// 4. Notifications & Reminders Scanner
async function initNotifications() {
  const notifBtn = document.querySelector('.notification-toggle');
  const dropdown = document.querySelector('.notification-dropdown');
  const badge = document.querySelector('.notification-badge');
  const notifList = document.querySelector('.notif-list');

  if (!notifBtn || !dropdown || !window.API) return;

  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !notifBtn.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });

  // Check for Web Notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    // Can request on user interaction
  }

  try {
    const res = await window.API.tasks.getAll({ limit: 100 });
    const tasks = res.tasks || [];
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const alerts = [];

    tasks.forEach(t => {
      if (t.status === 'completed' || !t.dueDate) return;
      const d = new Date(t.dueDate);
      if (d < startToday) {
        alerts.push({
          type: 'urgent',
          title: 'Overdue Task',
          message: `"${t.title}" is overdue!`,
          task: t
        });
      } else if (d >= startToday && d <= endToday) {
        alerts.push({
          type: 'warning',
          title: 'Due Today',
          message: `"${t.title}" is due today.`,
          task: t
        });
      }
    });

    if (badge) {
      if (alerts.length > 0) {
        badge.textContent = alerts.length > 9 ? '9+' : alerts.length;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }

    if (notifList) {
      if (alerts.length === 0) {
        notifList.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); padding: 16px;">All caught up! No urgent alerts.</div>';
      } else {
        notifList.innerHTML = alerts.map(a => `
          <div class="notif-item ${a.type}">
            <div style="font-weight: 700;">${a.title}</div>
            <div>${a.message}</div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

// 5. Global Task Modal (Create & Edit)
function initGlobalTaskModal() {
  const modalBackdrop = document.getElementById('taskModal');
  if (!modalBackdrop) return;

  const closeBtns = modalBackdrop.querySelectorAll('.modal-close');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modalBackdrop.classList.remove('active');
    });
  });

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      modalBackdrop.classList.remove('active');
    }
  });

  // Tag Chips Input
  const tagContainer = modalBackdrop.querySelector('.tags-input-container');
  const tagInput = modalBackdrop.querySelector('#modalTaskTagInput');

  if (tagContainer && tagInput) {
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = tagInput.value.trim().replace(/^#/, '');
        if (val) {
          addTagPill(tagContainer, tagInput, val);
          tagInput.value = '';
        }
      }
    });
  }

  // Load categories into select
  loadCategoriesIntoSelect();
}

function addTagPill(container, inputElement, text) {
  const pill = document.createElement('span');
  pill.className = 'tag-badge-pill';
  pill.innerHTML = `#${text} <i class="fa-solid fa-xmark"></i>`;
  pill.querySelector('i').addEventListener('click', () => pill.remove());
  container.insertBefore(pill, inputElement);
}

async function loadCategoriesIntoSelect() {
  const select = document.getElementById('modalTaskCategory');
  if (!select || !window.API) return;

  try {
    const res = await window.API.categories.getAll();
    const categories = res.categories || [];

    select.innerHTML = categories.map(c => `
      <option value="${c.name}">${c.name}</option>
    `).join('');
  } catch (err) {
    console.error('Failed to load categories into select:', err);
  }
}

// Global modal open helper
window.openCreateTaskModal = (preset = {}) => {
  const modal = document.getElementById('taskModal');
  if (!modal) return;

  document.getElementById('taskModalTitle').textContent = preset.id ? 'Edit Task' : 'Create New Task';
  document.getElementById('modalTaskId').value = preset.id || '';
  document.getElementById('modalTaskTitle').value = preset.title || '';
  document.getElementById('modalTaskDesc').value = preset.description || '';
  document.getElementById('modalTaskCategory').value = preset.category || 'Work';
  document.getElementById('modalTaskDueDate').value = preset.dueDate ? preset.dueDate.split('T')[0] : '';
  document.getElementById('modalTaskStatus').value = preset.status || 'todo';

  // Priority radio
  const priority = preset.priority || 'medium';
  const radio = modal.querySelector(`input[name="priority"][value="${priority}"]`);
  if (radio) radio.checked = true;

  // Clear & repopulate tags
  const container = modal.querySelector('.tags-input-container');
  const inputEl = modal.querySelector('#modalTaskTagInput');
  if (container && inputEl) {
    container.querySelectorAll('.tag-badge-pill').forEach(p => p.remove());
    if (preset.tags && Array.isArray(preset.tags)) {
      preset.tags.forEach(t => addTagPill(container, inputEl, t));
    }
  }

  modal.classList.add('active');
};
