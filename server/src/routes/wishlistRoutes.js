import express from 'express';
import { create, getAll, getById, update, remove, getStats, markPurchased } from '../controllers/wishlistController.js';

const router = express.Router();

router.post('/', create);
router.get('/', getAll);
router.get('/stats', getStats);
router.get('/:id', getById);
router.put('/:id', update);
router.put('/:id/purchase', markPurchased);
router.delete('/:id', remove);

export default router;
