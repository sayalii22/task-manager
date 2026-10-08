const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getStats,
  bulkActions,
  exportTasks,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// All task routes require authentication
router.use(protect);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.get('/stats', getStats);
router.get('/export', exportTasks);
router.post('/bulk', bulkActions);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.patch('/:id/status', updateTaskStatus);

module.exports = router;
