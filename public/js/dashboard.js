/**
 * Dashboard Analytics & Real-Time Statistics
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (window.Auth) window.Auth.requireAuth();

  await loadDashboardData();

  // Refresh data on custom events
  window.addEventListener('taskUpdated', () => {
    loadDashboardData();
  });
});

async function loadDashboardData() {
  try {
    const statsRes = await window.API.tasks.getStats();
    const stats = statsRes.stats;

    // 1. Update Metrics Cards
    updateCounter('statTotal', stats.total);
    updateCounter('statPending', stats.pending);
    updateCounter('statProgress', stats.inProgress);
    updateCounter('statCompleted', stats.completed);
    updateCounter('statOverdue', stats.overdue);
    updateCounter('statDueToday', stats.dueToday);
    updateCounter('statHighPriority', stats.highPriority);

    // 2. Update Circular Completion Ring
    updateCompletionRing(stats.completionRate, stats.completed, stats.total);

    // 3. Render 7-Day Completion Activity Chart
    renderActivityChart(stats.past7Days || []);

    // 4. Render Today's Tasks Checklist
    await renderTodayTasks();

    // 5. Render Upcoming Deadlines
    await renderUpcomingDeadlines();

  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    if (window.showToast) window.showToast('Could not load dashboard stats.', 'error');
  }
}

function updateCounter(elementId, targetValue) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = targetValue;
}

function updateCompletionRing(rate, completed, total) {
  const ring = document.getElementById('completionCircleBar');
  const percentText = document.getElementById('completionPercentText');
  const countText = document.getElementById('completionRatioText');

  if (percentText) percentText.textContent = `${rate}%`;
  if (countText) countText.textContent = `${completed} of ${total} tasks`;

  if (ring) {
    const radius = ring.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (rate / 100) * circumference;
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    ring.style.strokeDashoffset = offset;
  }
}

function renderActivityChart(activityDays) {
  const container = document.getElementById('activityChart');
  if (!container) return;

  const maxVal = Math.max(...activityDays.map(d => d.completed), 4);

  container.innerHTML = activityDays.map(d => {
    const heightPercent = maxVal > 0 ? Math.round((d.completed / maxVal) * 100) : 0;
    return `
      <div class="chart-bar-group">
        <div class="chart-bar-slot">
          <div class="chart-bar-tooltip">${d.completed} completed</div>
          <div class="chart-bar-fill" style="height: ${Math.max(heightPercent, 6)}%;"></div>
        </div>
        <span class="chart-bar-label">${d.day}</span>
      </div>
    `;
  }).join('');
}

async function renderTodayTasks() {
  const container = document.getElementById('todayTasksList');
  if (!container) return;

  try {
    const res = await window.API.tasks.getAll({ dueFilter: 'today', limit: 10 });
    const tasks = res.tasks || [];

    if (tasks.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-tertiary);">
          <i class="fa-solid fa-mug-hot" style="font-size: 2rem; margin-bottom: 8px; color: var(--primary);"></i>
          <p>No tasks due today. You are completely on track!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.map(t => {
      const isCompleted = t.status === 'completed';
      return `
        <div class="quick-task-item ${isCompleted ? 'completed' : ''}" data-id="${t._id}">
          <div class="task-checkbox ${isCompleted ? 'checked' : ''}" onclick="toggleTaskStatus('${t._id}', '${isCompleted ? 'todo' : 'completed'}')">
            <i class="fa-solid fa-check"></i>
          </div>
          <span class="task-title-text" onclick="window.location.href='/tasks'">${escapeHtml(t.title)}</span>
          <span class="badge badge-priority-${t.priority}">${t.priority}</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p style="color: var(--text-tertiary);">Failed to load today\'s tasks.</p>';
  }
}

async function renderUpcomingDeadlines() {
  const container = document.getElementById('upcomingDeadlinesList');
  if (!container) return;

  try {
    const res = await window.API.tasks.getAll({ dueFilter: 'upcoming', sortBy: 'due-asc', limit: 6 });
    const tasks = res.tasks || [];

    if (tasks.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-tertiary);">
          <p>No upcoming tasks scheduled.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.map(t => {
      const dateInfo = window.formatDueDate(t.dueDate);
      return `
        <div class="quick-task-item" onclick="window.location.href='/tasks'">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--priority-${t.priority}); flex-shrink: 0;"></div>
          <span class="task-title-text">${escapeHtml(t.title)}</span>
          <span class="badge badge-category">${t.category}</span>
          <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">${dateInfo ? dateInfo.text : ''}</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p style="color: var(--text-tertiary);">Failed to load deadlines.</p>';
  }
}

async function toggleTaskStatus(id, newStatus) {
  try {
    await window.API.tasks.updateStatus(id, newStatus);
    if (window.showToast) window.showToast(`Task marked as ${newStatus}!`, 'success');
    await loadDashboardData();
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

window.toggleTaskStatus = toggleTaskStatus;
