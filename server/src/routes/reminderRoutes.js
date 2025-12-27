import express from 'express';
import {
  create,
  getAll,
  getById,
  update,
  remove,
} from '../controllers/reminderController.js';

const router = express.Router();

// POST /api/reminders - Create a new reminder
router.post('/', create);

// GET /api/reminders - Get all reminders
router.get('/', getAll);

// GET /api/reminders/:id - Get reminder by ID
router.get('/:id', getById);

// PUT /api/reminders/:id - Update reminder
router.put('/:id', update);

// DELETE /api/reminders/:id - Delete reminder
router.delete('/:id', remove);

export default router;
