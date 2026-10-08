/**
 * Task Manager API Client & Common Utilities
 */

const API_BASE = '/api';

// Toast Notification Manager
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconClass =
    type === 'success'
      ? 'fa-circle-check text-green-500'
      : type === 'error'
      ? 'fa-circle-exclamation text-red-500'
      : type === 'warning'
      ? 'fa-triangle-exclamation text-amber-500'
      : 'fa-circle-info text-blue-500';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Authentication Storage Helpers
const Auth = {
  getToken() {
    return localStorage.getItem('tm_token');
  },
  setToken(token) {
    localStorage.setItem('tm_token', token);
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('tm_user')) || null;
    } catch {
      return null;
    }
  },
  setUser(user) {
    localStorage.setItem('tm_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_user');
  },
  isAuthenticated() {
    return Boolean(this.getToken());
  },
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/login';
    }
  },
  redirectIfAuth() {
    if (this.isAuthenticated()) {
      window.location.href = '/dashboard';
    }
  },
  logout() {
    this.clear();
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/login';
    }, 400);
  }
};

// Generic Fetch Wrapper
async function apiRequest(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      Auth.clear();
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed.');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// API Endpoints Mapping
const API = {
  auth: {
    login: (credentials) =>
      apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (userData) =>
      apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    getMe: () => apiRequest('/auth/me'),
    updateProfile: (profileData) =>
      apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      }),
  },
  tasks: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/tasks${query ? `?${query}` : ''}`);
    },
    getById: (id) => apiRequest(`/tasks/${id}`),
    create: (taskData) =>
      apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      }),
    update: (id, taskData) =>
      apiRequest(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(taskData),
      }),
    updateStatus: (id, status) =>
      apiRequest(`/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    delete: (id) =>
      apiRequest(`/tasks/${id}`, {
        method: 'DELETE',
      }),
    getStats: () => apiRequest('/tasks/stats'),
    bulk: (action, ids, value) =>
      apiRequest('/tasks/bulk', {
        method: 'POST',
        body: JSON.stringify({ action, ids, value }),
      }),
  },
  categories: {
    getAll: () => apiRequest('/categories'),
    create: (data) =>
      apiRequest('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiRequest(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiRequest(`/categories/${id}`, {
        method: 'DELETE',
      }),
  },
};

// Date Formatting Utilities
function formatDueDate(dateString) {
  if (!dateString) return null;
  const target = new Date(dateString);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffDays = Math.round((startTarget - startToday) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `${Math.abs(diffDays)}d overdue`,
      isOverdue: true,
      isDueToday: false,
      formatted: target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  }
  if (diffDays === 0) {
    return {
      text: 'Due Today',
      isOverdue: false,
      isDueToday: true,
      formatted: 'Today',
    };
  }
  if (diffDays === 1) {
    return {
      text: 'Tomorrow',
      isOverdue: false,
      isDueToday: false,
      formatted: 'Tomorrow',
    };
  }
  return {
    text: target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    isOverdue: false,
    isDueToday: false,
    formatted: target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

// Global Export
window.API = API;
window.Auth = Auth;
window.showToast = showToast;
window.formatDueDate = formatDueDate;
