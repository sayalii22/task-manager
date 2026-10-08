const db = require('../config/db');
const fallbackStore = require('../config/fallbackStore');

const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 };

function formatTask(row) {
  if (!row) return null;
  return {
    _id: row.id || row._id,
    id: row.id || row._id,
    user: row.user_id || row.user,
    userId: row.user_id || row.user,
    title: row.title,
    description: row.description || '',
    status: row.status || 'todo',
    priority: row.priority || 'medium',
    category: row.category || 'Work',
    tags: Array.isArray(row.tags) ? row.tags : [],
    dueDate: row.due_date || row.dueDate || null,
    reminderDate: row.reminder_date || row.reminderDate || null,
    isRecurring: Boolean(row.is_recurring ?? row.isRecurring ?? false),
    recurrence: row.recurrence || 'none',
    completedAt: row.completed_at || row.completedAt || null,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function toDbTask(taskData) {
  const dbData = {};
  if (taskData.user !== undefined || taskData.userId !== undefined) {
    dbData.user_id = taskData.user || taskData.userId;
  }
  if (taskData.title !== undefined) dbData.title = taskData.title;
  if (taskData.description !== undefined) dbData.description = taskData.description;
  if (taskData.status !== undefined) dbData.status = taskData.status;
  if (taskData.priority !== undefined) dbData.priority = taskData.priority;
  if (taskData.category !== undefined) dbData.category = taskData.category;
  if (taskData.tags !== undefined) {
    dbData.tags = Array.isArray(taskData.tags) ? taskData.tags : [];
  }
  if (taskData.dueDate !== undefined) {
    dbData.due_date = taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null;
  }
  if (taskData.reminderDate !== undefined) {
    dbData.reminder_date = taskData.reminderDate ? new Date(taskData.reminderDate).toISOString() : null;
  }
  if (taskData.isRecurring !== undefined) {
    dbData.is_recurring = Boolean(taskData.isRecurring);
  }
  if (taskData.recurrence !== undefined) {
    dbData.recurrence = taskData.recurrence;
  }
  if (taskData.completedAt !== undefined) {
    dbData.completed_at = taskData.completedAt ? new Date(taskData.completedAt).toISOString() : null;
  }
  return dbData;
}

const TaskModel = {
  formatTask,
  toDbTask,

  async find(userId, filters = {}, sortOptions = {}, pagination = {}) {
    const { status, priority, category, search, dueFilter, tag } = filters;
    const { sortBy = 'newest' } = sortOptions;
    const page = parseInt(pagination.page, 10) || 1;
    const limit = parseInt(pagination.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (db.isConnected && db.supabase) {
      let query = db.supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (priority && priority !== 'all') {
        query = query.eq('priority', priority);
      }
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (tag) {
        query = query.contains('tags', [tag]);
      }

      // Due date filter
      if (dueFilter === 'today') {
        query = query.gte('due_date', startOfToday.toISOString()).lte('due_date', endOfToday.toISOString());
      } else if (dueFilter === 'overdue') {
        query = query.lt('due_date', startOfToday.toISOString()).neq('status', 'completed');
      } else if (dueFilter === 'upcoming') {
        query = query.gt('due_date', endOfToday.toISOString());
      } else if (dueFilter === 'week') {
        const endOfWeek = new Date(startOfToday);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        query = query.gte('due_date', startOfToday.toISOString()).lte('due_date', endOfWeek.toISOString());
      }

      // Search across title and description
      if (search && search.trim()) {
        const cleanTerm = search.trim().replace(/[%_]/g, '');
        query = query.or(`title.ilike.%${cleanTerm}%,description.ilike.%${cleanTerm}%`);
      }

      // Sort
      if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'due-asc') {
        query = query.order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
      } else if (sortBy === 'due-desc') {
        query = query.order('due_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
      } else if (sortBy === 'updated') {
        query = query.order('updated_at', { ascending: false });
      } else if (sortBy === 'priority') {
        query = query.order('priority', { ascending: false }).order('created_at', { ascending: false });
      } else {
        // default newest
        query = query.order('created_at', { ascending: false });
      }

      const { data, count, error } = await query.range(skip, skip + limit - 1);

      if (error) {
        console.error('Supabase Task.find error:', error.message);
        throw error;
      }

      const tasks = (data || []).map(formatTask);
      const total = count || 0;

      return {
        tasks,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    // Fallback store query execution
    let allTasks = fallbackStore.findTasksByUser(userId);

    // Filter
    let filtered = allTasks.filter((t) => {
      if (status && status !== 'all' && t.status !== status) return false;
      if (priority && priority !== 'all' && t.priority !== priority) return false;
      if (category && category !== 'all' && t.category !== category) return false;
      if (tag && (!t.tags || !t.tags.includes(tag))) return false;

      if (dueFilter && t.dueDate) {
        const d = new Date(t.dueDate);
        if (dueFilter === 'today' && (d < startOfToday || d > endOfToday)) return false;
        if (dueFilter === 'overdue' && (d >= startOfToday || t.status === 'completed')) return false;
        if (dueFilter === 'upcoming' && d <= endOfToday) return false;
        if (dueFilter === 'week') {
          const endOfWeek = new Date(startOfToday);
          endOfWeek.setDate(endOfWeek.getDate() + 7);
          if (d < startOfToday || d > endOfWeek) return false;
        }
      } else if (dueFilter && !t.dueDate) {
        return false;
      }

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const inTitle = t.title && t.title.toLowerCase().includes(q);
        const inDesc = t.description && t.description.toLowerCase().includes(q);
        const inTags = Array.isArray(t.tags) && t.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTags) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'due-asc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (sortBy === 'due-desc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate) - new Date(a.dueDate);
      }
      if (sortBy === 'priority') {
        const weightA = priorityWeights[a.priority] || 0;
        const weightB = priorityWeights[b.priority] || 0;
        return weightB - weightA;
      }
      if (sortBy === 'updated') return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit).map(formatTask);

    return {
      tasks: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  async findById(id, userId) {
    if (!id) return null;

    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return null;
      }
      return formatTask(data);
    }

    const t = fallbackStore.findTaskById(id);
    if (!t || String(t.user) !== String(userId)) return null;
    return formatTask(t);
  },

  async create(taskData) {
    if (db.isConnected && db.supabase) {
      const insertPayload = {
        user_id: taskData.user,
        title: taskData.title.trim(),
        description: taskData.description ? taskData.description.trim() : '',
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        category: taskData.category ? taskData.category.trim() : 'Work',
        tags: Array.isArray(taskData.tags) ? taskData.tags : [],
        due_date: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
        reminder_date: taskData.reminderDate ? new Date(taskData.reminderDate).toISOString() : null,
        is_recurring: Boolean(taskData.isRecurring),
        recurrence: taskData.recurrence || 'none',
        completed_at: taskData.completedAt ? new Date(taskData.completedAt).toISOString() : null,
      };

      const { data, error } = await db.supabase
        .from('tasks')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error('Supabase createTask error:', error.message);
        throw error;
      }
      return formatTask(data);
    }

    return formatTask(fallbackStore.createTask(taskData));
  },

  async update(id, updateData, userId) {
    if (db.isConnected && db.supabase) {
      const dbUpdate = toDbTask(updateData);

      if (updateData.status === 'completed' && !updateData.completedAt) {
        dbUpdate.completed_at = new Date().toISOString();
      } else if (updateData.status && updateData.status !== 'completed') {
        dbUpdate.completed_at = null;
      }

      dbUpdate.updated_at = new Date().toISOString();

      const { data, error } = await db.supabase
        .from('tasks')
        .update(dbUpdate)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Supabase update task error:', error.message);
        throw error;
      }
      return formatTask(data);
    }

    return formatTask(fallbackStore.updateTask(id, updateData));
  },

  async delete(id, userId) {
    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return formatTask(data);
    }

    return formatTask(fallbackStore.deleteTask(id, userId));
  },

  async deleteMany(ids, userId) {
    if (!ids || ids.length === 0) return 0;

    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('tasks')
        .delete()
        .in('id', ids)
        .eq('user_id', userId)
        .select('id');

      if (error) throw error;
      return data ? data.length : 0;
    }

    return fallbackStore.deleteManyTasks(ids, userId);
  },

  async updateMany(ids, updateData, userId) {
    if (!ids || ids.length === 0) return 0;

    if (db.isConnected && db.supabase) {
      const dbUpdate = toDbTask(updateData);
      dbUpdate.updated_at = new Date().toISOString();

      const { data, error } = await db.supabase
        .from('tasks')
        .update(dbUpdate)
        .in('id', ids)
        .eq('user_id', userId)
        .select('id');

      if (error) throw error;
      return data ? data.length : 0;
    }

    const store = fallbackStore.getStore();
    let count = 0;
    const idSet = new Set(ids.map(String));
    store.tasks.forEach((t) => {
      if (String(t.user) === String(userId) && idSet.has(String(t._id))) {
        Object.assign(t, updateData, { updatedAt: new Date().toISOString() });
        count++;
      }
    });
    fallbackStore.persistStore();
    return count;
  },

  async getStats(userId) {
    let tasks = [];
    if (db.isConnected && db.supabase) {
      const { data, error } = await db.supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      tasks = (data || []).map(formatTask);
    } else {
      tasks = fallbackStore.findTasksByUser(userId).map(formatTask);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const total = tasks.length;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    let dueToday = 0;
    let highPriority = 0;

    const priorityBreakdown = { low: 0, medium: 0, high: 0, urgent: 0 };
    const categoryBreakdown = {};

    // 7-day completion activity
    const past7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      past7Days.push({ date: dateStr, day: dayName, completed: 0, created: 0 });
    }

    tasks.forEach((t) => {
      // Status counts
      if (t.status === 'completed') completed++;
      else if (t.status === 'in-progress') inProgress++;
      else pending++;

      // Priorities
      if (t.priority === 'high' || t.priority === 'urgent') highPriority++;
      if (priorityBreakdown[t.priority] !== undefined) {
        priorityBreakdown[t.priority]++;
      }

      // Categories
      const cat = t.category || 'Other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;

      // Due date checks
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        if (d >= startOfToday && d <= endOfToday) {
          dueToday++;
        }
        if (d < startOfToday && t.status !== 'completed') {
          overdue++;
        }
      }

      // Activity trend
      if (t.completedAt) {
        const compDateStr = new Date(t.completedAt).toISOString().split('T')[0];
        const daySlot = past7Days.find((slot) => slot.date === compDateStr);
        if (daySlot) daySlot.completed++;
      }
      if (t.createdAt) {
        const createdDateStr = new Date(t.createdAt).toISOString().split('T')[0];
        const daySlot = past7Days.find((slot) => slot.date === createdDateStr);
        if (daySlot) daySlot.created++;
      }
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
      dueToday,
      highPriority,
      completionRate,
      priorityBreakdown,
      categoryBreakdown,
      past7Days,
    };
  },
};

module.exports = TaskModel;
