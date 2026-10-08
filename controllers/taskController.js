const Task = require('../models/Task');

// @desc    Get all tasks for logged in user (with filters, search, sort, pagination)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      category,
      search,
      dueFilter,
      tag,
      sortBy,
      page,
      limit,
    } = req.query;

    const result = await Task.find(
      req.user._id,
      { status, priority, category, search, dueFilter, tag },
      { sortBy },
      { page, limit }
    );

    res.status(200).json({
      success: true,
      count: result.tasks.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      tasks: result.tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id, req.user._id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied.',
      });
    }

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      category,
      tags,
      dueDate,
      reminderDate,
      isRecurring,
      recurrence,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required.',
      });
    }

    // Clean tags
    let processedTags = [];
    if (Array.isArray(tags)) {
      processedTags = tags.map((t) => String(t).trim().replace(/^#/, '')).filter(Boolean);
    } else if (typeof tags === 'string') {
      processedTags = tags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);
    }

    const task = await Task.create({
      user: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      status: ['todo', 'in-progress', 'completed'].includes(status) ? status : 'todo',
      priority: ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
      category: category ? category.trim() : 'Work',
      tags: processedTags,
      dueDate: dueDate ? new Date(dueDate) : null,
      reminderDate: reminderDate ? new Date(reminderDate) : null,
      isRecurring: Boolean(isRecurring),
      recurrence: ['none', 'daily', 'weekly', 'monthly'].includes(recurrence) ? recurrence : 'none',
      completedAt: status === 'completed' ? new Date() : null,
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully!',
      task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task details
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      category,
      tags,
      dueDate,
      reminderDate,
      isRecurring,
      recurrence,
    } = req.body;

    const existingTask = await Task.findById(req.params.id, req.user._id);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied.',
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category.trim();
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (reminderDate !== undefined) updateData.reminderDate = reminderDate ? new Date(reminderDate) : null;
    if (isRecurring !== undefined) updateData.isRecurring = Boolean(isRecurring);
    if (recurrence !== undefined) updateData.recurrence = recurrence;

    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        updateData.tags = tags.map((t) => String(t).trim().replace(/^#/, '')).filter(Boolean);
      } else if (typeof tags === 'string') {
        updateData.tags = tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
      }
    }

    const updatedTask = await Task.update(req.params.id, updateData, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Task updated successfully!',
      task: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Quick status change (e.g. Kanban drag or checkbox toggle)
// @route   PATCH /api/tasks/:id/status
// @access  Private
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['todo', 'in-progress', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be todo, in-progress, or completed.',
      });
    }

    const existingTask = await Task.findById(req.params.id, req.user._id);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied.',
      });
    }

    const updatedTask = await Task.update(
      req.params.id,
      { status },
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: `Task status updated to ${status}`,
      task: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id, req.user._id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied.',
      });
    }

    await Task.delete(req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard metrics & statistics
// @route   GET /api/tasks/stats
// @access  Private
const getStats = async (req, res, next) => {
  try {
    const stats = await Task.getStats(req.user._id);
    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk actions (delete, status, priority, category)
// @route   POST /api/tasks/bulk
// @access  Private
const bulkActions = async (req, res, next) => {
  try {
    const { action, ids, value } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of task IDs to perform bulk action.',
      });
    }

    if (action === 'delete') {
      const deletedCount = await Task.deleteMany(ids, req.user._id);
      return res.status(200).json({
        success: true,
        message: `Successfully deleted ${deletedCount} tasks.`,
      });
    }

    if (action === 'status') {
      if (!['todo', 'in-progress', 'completed'].includes(value)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
      }
      const modifiedCount = await Task.updateMany(ids, { status: value }, req.user._id);
      return res.status(200).json({
        success: true,
        message: `Updated status for ${modifiedCount} tasks.`,
      });
    }

    if (action === 'priority') {
      if (!['low', 'medium', 'high', 'urgent'].includes(value)) {
        return res.status(400).json({ success: false, message: 'Invalid priority value' });
      }
      const modifiedCount = await Task.updateMany(ids, { priority: value }, req.user._id);
      return res.status(200).json({
        success: true,
        message: `Updated priority for ${modifiedCount} tasks.`,
      });
    }

    if (action === 'category') {
      if (!value) {
        return res.status(400).json({ success: false, message: 'Invalid category value' });
      }
      const modifiedCount = await Task.updateMany(ids, { category: value }, req.user._id);
      return res.status(200).json({
        success: true,
        message: `Updated category for ${modifiedCount} tasks.`,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Unknown bulk action.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export tasks to CSV or JSON
// @route   GET /api/tasks/export
// @access  Private
const exportTasks = async (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const result = await Task.find(req.user._id, {}, { sortBy: 'newest' }, { limit: 10000 });
    const tasks = result.tasks;

    if (format === 'csv') {
      // Build CSV
      const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Category', 'Due Date', 'Tags', 'Created At'];
      const rows = tasks.map((t) => [
        `"${String(t._id)}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${t.status || 'todo'}"`,
        `"${t.priority || 'medium'}"`,
        `"${t.category || 'Other'}"`,
        `"${t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : ''}"`,
        `"${(t.tags || []).join(';')}"`,
        `"${t.createdAt ? new Date(t.createdAt).toISOString() : ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="tasks-export.csv"');
      return res.status(200).send(csvContent);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks-export.json"');
    return res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getStats,
  bulkActions,
  exportTasks,
};
