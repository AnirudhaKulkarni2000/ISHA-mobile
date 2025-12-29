import express from 'express';
import * as booksController from '../controllers/booksController.js';

const router = express.Router();

router.get('/', booksController.getAllBooks);
router.get('/:id', booksController.getBookById);
router.post('/', booksController.createBook);
router.put('/:id', booksController.updateBook);
router.delete('/:id', booksController.deleteBook);

export default router;
