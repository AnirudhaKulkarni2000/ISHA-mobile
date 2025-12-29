import pool from '../configs/dbConfig.js';

// Create expense categories table
export const createExpenseCategoriesTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS expense_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      icon VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
    await pool.query(query);

    // Insert default categories if table is empty
    const countResult = await pool.query('SELECT COUNT(*) FROM expense_categories');
    if (parseInt(countResult.rows[0].count) === 0) {
        const defaultCategories = [
            { name: 'Food', icon: '🍔' },
            { name: 'Transport', icon: '🚗' },
            { name: 'Shopping', icon: '🛒' },
            { name: 'Entertainment', icon: '🎮' },
            { name: 'Bills', icon: '📝' },
            { name: 'Health', icon: '💊' },
            { name: 'Other', icon: '📦' }
        ];

        for (const cat of defaultCategories) {
            await pool.query('INSERT INTO expense_categories (name, icon) VALUES ($1, $2)', [cat.name, cat.icon]);
        }
    }
};

// Create a new category
export const createCategory = async (categoryData) => {
    const { name, icon } = categoryData;
    const query = `
    INSERT INTO expense_categories (name, icon)
    VALUES ($1, $2)
    RETURNING *
  `;
    const result = await pool.query(query, [name, icon || '📦']);
    return result.rows[0];
};

// Get all categories
export const getAllCategories = async () => {
    const query = 'SELECT * FROM expense_categories ORDER BY name ASC';
    const result = await pool.query(query);
    return result.rows;
};

// Get category by ID
export const getCategoryById = async (id) => {
    const query = 'SELECT * FROM expense_categories WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

// Update category
export const updateCategory = async (id, categoryData) => {
    const { name, icon } = categoryData;
    const query = `
    UPDATE expense_categories
    SET name = COALESCE($1, name),
        icon = COALESCE($2, icon),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
    const result = await pool.query(query, [name, icon, id]);
    return result.rows[0];
};

// Delete category
export const deleteCategory = async (id) => {
    const query = 'DELETE FROM expense_categories WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

export default {
    createExpenseCategoriesTable,
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};

// Initialize table
createExpenseCategoriesTable().catch(err => console.error('Error creating expense categories table:', err));
