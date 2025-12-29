import express from 'express';
import * as animeController from '../controllers/animeController.js';

const router = express.Router();

router.get('/', animeController.getAllAnime);
router.get('/:id', animeController.getAnimeById);
router.post('/', animeController.createAnime);
router.put('/:id', animeController.updateAnime);
router.put('/:id/toggle', animeController.toggleCompleted);
router.delete('/:id', animeController.deleteAnime);

export default router;
