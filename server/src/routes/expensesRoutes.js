import express from 'express';
import * as expensesController from '../controllers/expensesController.js';

const router = express.Router();

// Expense routes
router.get('/', expensesController.getAllExpenses);
router.get('/stats', expensesController.getExpenseStats);
router.get('/category-summary', expensesController.getCategorySummary);
router.get('/:id', expensesController.getExpenseById);
router.post('/', expensesController.createExpense);
router.put('/:id', expensesController.updateExpense);
router.delete('/:id', expensesController.deleteExpense);

// Category routes
router.get('/categories/all', expensesController.getAllCategories);
router.post('/categories', expensesController.createCategory);
router.put('/categories/:id', expensesController.updateCategory);
router.delete('/categories/:id', expensesController.deleteCategory);

export default router;
