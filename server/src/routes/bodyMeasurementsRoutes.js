import express from 'express';
import {
    create,
    getAll,
    getLatest,
    getById,
    update,
    remove,
} from '../controllers/bodyMeasurementsController.js';

const router = express.Router();

// POST /api/measurements - Create a new measurement entry
router.post('/', create);

// GET /api/measurements - Get all measurement entries (history)
router.get('/', getAll);

// GET /api/measurements/latest - Get the latest measurement
router.get('/latest', getLatest);

// GET /api/measurements/:id - Get measurement by ID
router.get('/:id', getById);

// PUT /api/measurements/:id - Update measurement entry
router.put('/:id', update);

// DELETE /api/measurements/:id - Delete measurement entry
router.delete('/:id', remove);

export default router;
