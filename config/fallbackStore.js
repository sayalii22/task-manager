const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'local-fallback.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data dir, using in-memory store only');
  }
}

// Initial in-memory state
let store = {
  users: [],
  categories: [],
  tasks: []
};

// Load existing data from file if present
function loadStore() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      store = JSON.parse(raw);
    } catch (err) {
      console.warn('Failed to parse fallback store file, resetting in-memory store:', err.message);
    }
  }
}

function persistStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist store to file:', err.message);
  }
}

loadStore();

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

module.exports = {
  getStore: () => store,
  persistStore,
  generateId,

  // User Helpers
  findUserByEmail: (email) => {
    return store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserById: (id) => {
    return store.users.find(u => String(u._id) === String(id));
  },
  createUser: (userData) => {
    const user = {
      _id: generateId(),
      ...userData,
      email: userData.email.toLowerCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.users.push(user);
    persistStore();
    return user;
  },

  // Category Helpers
  findCategoriesByUser: (userId) => {
    return store.categories.filter(c => String(c.user) === String(userId) || c.isDefault);
  },
  findCategoryById: (id) => {
    return store.categories.find(c => String(c._id) === String(id));
  },
  createCategory: (catData) => {
    const category = {
      _id: generateId(),
      ...catData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.categories.push(category);
    persistStore();
    return category;
  },
  deleteCategory: (id, userId) => {
    const idx = store.categories.findIndex(c => String(c._id) === String(id) && String(c.user) === String(userId));
    if (idx !== -1) {
      const deleted = store.categories.splice(idx, 1)[0];
      persistStore();
      return deleted;
    }
    return null;
  },

  // Task Helpers
  findTasksByUser: (userId) => {
    return store.tasks.filter(t => String(t.user) === String(userId));
  },
  findTaskById: (id) => {
    return store.tasks.find(t => String(t._id) === String(id));
  },
  createTask: (taskData) => {
    const task = {
      _id: generateId(),
      ...taskData,
      tags: Array.isArray(taskData.tags) ? taskData.tags : [],
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.tasks.push(task);
    persistStore();
    return task;
  },
  updateTask: (id, updateData) => {
    const task = store.tasks.find(t => String(t._id) === String(id));
    if (!task) return null;
    Object.assign(task, updateData, { updatedAt: new Date().toISOString() });
    if (updateData.status === 'completed' && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    } else if (updateData.status && updateData.status !== 'completed') {
      task.completedAt = null;
    }
    persistStore();
    return task;
  },
  deleteTask: (id, userId) => {
    const idx = store.tasks.findIndex(t => String(t._id) === String(id) && String(t.user) === String(userId));
    if (idx !== -1) {
      const deleted = store.tasks.splice(idx, 1)[0];
      persistStore();
      return deleted;
    }
    return null;
  },
  deleteManyTasks: (ids, userId) => {
    const idSet = new Set(ids.map(String));
    const initialCount = store.tasks.length;
    store.tasks = store.tasks.filter(t => !(String(t.user) === String(userId) && idSet.has(String(t._id))));
    persistStore();
    return initialCount - store.tasks.length;
  }
};
