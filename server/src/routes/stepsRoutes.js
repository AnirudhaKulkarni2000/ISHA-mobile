import express from 'express';
import * as stepsController from '../controllers/stepsController.js';

const router = express.Router();

// GET all steps entries
router.get('/', stepsController.getAllSteps);

// GET weekly steps
router.get('/weekly', stepsController.getWeeklySteps);

// GET goal
router.get('/goal', stepsController.getGoal);

// GET steps by date
router.get('/date/:date', stepsController.getStepsByDate);

// GET steps by ID
router.get('/:id', stepsController.getStepsById);

// POST create new steps entry
router.post('/', stepsController.createSteps);

// POST add steps to today
router.post('/add-today', stepsController.addStepsToday);

// PUT update goal
router.put('/goal', stepsController.updateGoal);

// PUT update steps by ID
router.put('/:id', stepsController.updateSteps);

// DELETE steps by ID
router.delete('/:id', stepsController.deleteSteps);

export default router;
