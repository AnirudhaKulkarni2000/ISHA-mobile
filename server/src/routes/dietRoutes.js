import express from 'express';
import {
  create,
  getAll,
  getById,
  getByWeekDay,
  getByMealType,
  update,
  remove,
} from '../controllers/dietController.js';

const router = express.Router();

// POST /api/diets - Create a new diet log
router.post('/', create);

// GET /api/diets - Get all diet logs
router.get('/', getAll);

// GET /api/diets/week/:week/day/:day - Get diet logs by week and day
router.get('/week/:week/day/:day', getByWeekDay);

// GET /api/diets/meal/:mealType - Get diet logs by meal type
router.get('/meal/:mealType', getByMealType);

// GET /api/diets/:id - Get diet log by ID
router.get('/:id', getById);

// PUT /api/diets/:id - Update diet log
router.put('/:id', update);

// DELETE /api/diets/:id - Delete diet log
router.delete('/:id', remove);

export default router;
