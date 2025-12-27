import express from 'express';
import {
  create,
  getAll,
  getById,
  update,
  remove,
} from '../controllers/workoutController.js';

const router = express.Router();

// POST /api/workouts - Create a new workout
router.post('/', create);

// GET /api/workouts - Get all workouts
router.get('/', getAll);

// GET /api/workouts/:id - Get workout by ID
router.get('/:id', getById);

// PUT /api/workouts/:id - Update workout
router.put('/:id', update);

// DELETE /api/workouts/:id - Delete workout
router.delete('/:id', remove);

export default router;
