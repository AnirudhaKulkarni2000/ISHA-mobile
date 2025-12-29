import pool from '../configs/dbConfig.js';

// Create expenses table
export const createExpensesTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
      price DECIMAL(10, 2) NOT NULL,
      date DATE DEFAULT CURRENT_DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
    await pool.query(query);
};

// Create a new expense
export const createExpense = async (expenseData) => {
    const { name, category_id, price, date, notes } = expenseData;
    const query = `
    INSERT INTO expenses (name, category_id, price, date, notes)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
    const result = await pool.query(query, [name, category_id, price, date || new Date(), notes]);
    return result.rows[0];
};

// Get all expenses with category info
export const getAllExpenses = async () => {
    const query = `
    SELECT e.*, ec.name as category_name, ec.icon as category_icon
    FROM expenses e
    LEFT JOIN expense_categories ec ON e.category_id = ec.id
    ORDER BY e.date DESC, e.created_at DESC
  `;
    const result = await pool.query(query);
    return result.rows;
};

// Get expense by ID
export const getExpenseById = async (id) => {
    const query = `
    SELECT e.*, ec.name as category_name, ec.icon as category_icon
    FROM expenses e
    LEFT JOIN expense_categories ec ON e.category_id = ec.id
    WHERE e.id = $1
  `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

// Get expenses by category
export const getExpensesByCategory = async (categoryId) => {
    const query = `
    SELECT e.*, ec.name as category_name, ec.icon as category_icon
    FROM expenses e
    LEFT JOIN expense_categories ec ON e.category_id = ec.id
    WHERE e.category_id = $1
    ORDER BY e.date DESC
  `;
    const result = await pool.query(query, [categoryId]);
    return result.rows;
};

// Get expenses by date range
export const getExpensesByDateRange = async (startDate, endDate) => {
    const query = `
    SELECT e.*, ec.name as category_name, ec.icon as category_icon
    FROM expenses e
    LEFT JOIN expense_categories ec ON e.category_id = ec.id
    WHERE e.date BETWEEN $1 AND $2
    ORDER BY e.date DESC
  `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
};

// Update expense
export const updateExpense = async (id, expenseData) => {
    const { name, category_id, price, date, notes } = expenseData;
    const query = `
    UPDATE expenses
    SET name = COALESCE($1, name),
        category_id = COALESCE($2, category_id),
        price = COALESCE($3, price),
        date = COALESCE($4, date),
        notes = COALESCE($5, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
    const result = await pool.query(query, [name, category_id, price, date, notes, id]);
    return result.rows[0];
};

// Delete expense
export const deleteExpense = async (id) => {
    const query = 'DELETE FROM expenses WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

// Get expense statistics
export const getExpenseStats = async () => {
    const query = `
    SELECT 
      COUNT(*) as total_transactions,
      COALESCE(SUM(price), 0) as total_spent,
      COALESCE(AVG(price), 0) as avg_expense
    FROM expenses
  `;
    const result = await pool.query(query);
    return result.rows[0];
};

// Get expenses by category summary
export const getExpensesByCategortSummary = async () => {
    const query = `
    SELECT 
      ec.id,
      ec.name,
      ec.icon,
      COUNT(e.id) as transaction_count,
      COALESCE(SUM(e.price), 0) as total_amount
    FROM expense_categories ec
    LEFT JOIN expenses e ON ec.id = e.category_id
    GROUP BY ec.id, ec.name, ec.icon
    ORDER BY total_amount DESC
  `;
    const result = await pool.query(query);
    return result.rows;
};

export default {
    createExpensesTable,
    createExpense,
    getAllExpenses,
    getExpenseById,
    getExpensesByCategory,
    getExpensesByDateRange,
    updateExpense,
    deleteExpense,
    getExpenseStats,
    getExpensesByCategortSummary
};

// Initialize table (after categories table is created)
setTimeout(() => {
    createExpensesTable().catch(err => console.error('Error creating expenses table:', err));
}, 1000);
