import * as expensesModel from '../models/expensesModel.js';
import * as categoriesModel from '../models/expenseCategoriesModel.js';

// ===== EXPENSES =====

// Get all expenses
export const getAllExpenses = async (req, res) => {
    try {
        const expenses = await expensesModel.getAllExpenses();
        res.json({ success: true, data: expenses });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get expense by ID
export const getExpenseById = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await expensesModel.getExpenseById(id);
        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }
        res.json({ success: true, data: expense });
    } catch (error) {
        console.error('Error fetching expense:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create expense
export const createExpense = async (req, res) => {
    try {
        const expense = await expensesModel.createExpense(req.body);
        res.status(201).json({ success: true, data: expense });
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update expense
export const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await expensesModel.updateExpense(id, req.body);
        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }
        res.json({ success: true, data: expense });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete expense
export const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await expensesModel.deleteExpense(id);
        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }
        res.json({ success: true, data: expense, message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get expense stats
export const getExpenseStats = async (req, res) => {
    try {
        const stats = await expensesModel.getExpenseStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error fetching expense stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get expenses by category summary
export const getCategorySummary = async (req, res) => {
    try {
        const summary = await expensesModel.getExpensesByCategortSummary();
        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Error fetching category summary:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ===== CATEGORIES =====

// Get all categories
export const getAllCategories = async (req, res) => {
    try {
        const categories = await categoriesModel.getAllCategories();
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create category
export const createCategory = async (req, res) => {
    try {
        const category = await categoriesModel.createCategory(req.body);
        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update category
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await categoriesModel.updateCategory(id, req.body);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete category
export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await categoriesModel.deleteCategory(id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.json({ success: true, data: category, message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
