import express from 'express';
import {
  create,
  getAll,
  getById,
  getByWeek,
  getByDayOfMonth,
  getByDay,
  checkDuplicate,
  update,
  remove,
} from '../controllers/foodRecipeController.js';

const router = express.Router();

// POST /api/food-recipes - Create a new food recipe
router.post('/', create);

// GET /api/food-recipes - Get all food recipes
router.get('/', getAll);

// GET /api/food-recipes/check-duplicate - Check if recipe exists for day_of_month/meal_type
router.get('/check-duplicate', checkDuplicate);

// GET /api/food-recipes/week/:week - Get food recipes by week
router.get('/week/:week', getByWeek);

// GET /api/food-recipes/day-of-month/:dayOfMonth - Get food recipes by day of month
router.get('/day-of-month/:dayOfMonth', getByDayOfMonth);

// GET /api/food-recipes/day/:day - Get food recipes by day (legacy)
router.get('/day/:day', getByDay);

// GET /api/food-recipes/:id - Get food recipe by ID
router.get('/:id', getById);

// PUT /api/food-recipes/:id - Update food recipe
router.put('/:id', update);

// DELETE /api/food-recipes/:id - Delete food recipe
router.delete('/:id', remove);

export default router;
