/**
 * Interactive Calendar View Logic: Month Grid, Day Tasks & Date-based Task Scheduling
 */

let calendarDate = new Date();
let monthTasks = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (window.Auth) window.Auth.requireAuth();

  initCalendarControls();
  await loadMonthCalendar();
});

function initCalendarControls() {
  const prevBtn = document.getElementById('calPrevBtn');
  const nextBtn = document.getElementById('calNextBtn');
  const todayBtn = document.getElementById('calTodayBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      calendarDate.setMonth(calendarDate.getMonth() - 1);
      loadMonthCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      calendarDate.setMonth(calendarDate.getMonth() + 1);
      loadMonthCalendar();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      calendarDate = new Date();
      loadMonthCalendar();
    });
  }
}

async function loadMonthCalendar() {
  updateCalendarTitle();

  try {
    const res = await window.API.tasks.getAll({ limit: 500 });
    monthTasks = res.tasks || [];
    renderCalendarGrid();
  } catch (err) {
    console.error('Failed to load tasks for calendar:', err);
  }
}

function updateCalendarTitle() {
  const titleEl = document.getElementById('calMonthTitle');
  if (!titleEl) return;
  const monthName = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  titleEl.textContent = monthName;
}

function renderCalendarGrid() {
  const grid = document.getElementById('calendarDaysGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  // First day of month & total days
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // 1. Prev month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const cell = createDayCell(dayNum, true, null);
    grid.appendChild(cell);
  }

  // 2. Current month days
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = isCurrentMonth && today.getDate() === d;
    const dayTasks = monthTasks.filter(t => t.dueDate && t.dueDate.startsWith(dateStr));

    const cell = createDayCell(d, false, dateStr, isToday, dayTasks);
    grid.appendChild(cell);
  }

  // 3. Next month leading days to fill 35 or 42 grid cells
  const currentCellCount = firstDayIndex + totalDays;
  const nextMonthCells = (currentCellCount % 7 === 0) ? 0 : 7 - (currentCellCount % 7);
  for (let d = 1; d <= nextMonthCells; d++) {
    const cell = createDayCell(d, true, null);
    grid.appendChild(cell);
  }
}

function createDayCell(dayNum, isOtherMonth, dateStr, isToday = false, tasks = []) {
  const cell = document.createElement('div');
  cell.className = `calendar-day-cell ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;

  cell.innerHTML = `
    <div class="day-cell-header">
      <span class="day-number">${dayNum}</span>
      ${tasks && tasks.length > 0 ? `<span class="badge" style="font-size: 0.65rem; padding: 1px 5px; background: var(--bg-card); color: var(--primary);">${tasks.length}</span>` : ''}
    </div>
    <div class="day-task-chips">
      ${(tasks || []).slice(0, 3).map(t => `
        <div class="calendar-task-chip" style="background: var(--priority-${t.priority});" title="${t.title}">
          ${escapeHtml(t.title)}
        </div>
      `).join('')}
      ${(tasks || []).length > 3 ? `<span style="font-size: 0.68rem; color: var(--text-tertiary); font-weight: 700;">+${tasks.length - 3} more</span>` : ''}
    </div>
  `;

  if (!isOtherMonth && dateStr) {
    cell.addEventListener('click', () => {
      openDateInspector(dateStr, tasks);
    });
  }

  return cell;
}

function openDateInspector(dateStr, tasks) {
  const modal = document.getElementById('dayDetailsModal');
  const modalTitle = document.getElementById('dayModalTitle');
  const tasksContainer = document.getElementById('dayModalTasksList');
  const addBtn = document.getElementById('dayModalAddTaskBtn');

  if (!modal) return;

  const displayDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (modalTitle) modalTitle.textContent = displayDate;

  if (tasksContainer) {
    if (!tasks || tasks.length === 0) {
      tasksContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-tertiary);">
          <p>No tasks scheduled for this day.</p>
        </div>
      `;
    } else {
      tasksContainer.innerHTML = tasks.map(t => `
        <div class="quick-task-item" style="cursor: default;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--priority-${t.priority});"></div>
          <span class="task-title-text">${escapeHtml(t.title)}</span>
          <span class="badge badge-status badge-status-${t.status}">${t.status}</span>
        </div>
      `).join('');
    }
  }

  if (addBtn) {
    addBtn.onclick = () => {
      modal.classList.remove('active');
      window.openCreateTaskModal({ dueDate: dateStr });
    };
  }

  modal.classList.add('active');
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
