import pool from '../configs/dbConfig.js';

// Initialize shopping_list table
export const createShoppingListTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS shopping_list (
      id SERIAL PRIMARY KEY,
      grocery_name VARCHAR(255) NOT NULL,
      amount VARCHAR(100),
      price_rupees DECIMAL(10,2) DEFAULT 0,
      day VARCHAR(50),
      date VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
};

// Create a new shopping list item
export const createShoppingItem = async (itemData) => {
  const { grocery_name, amount, price_rupees, day, date } = itemData;
  const query = `
    INSERT INTO shopping_list (grocery_name, amount, price_rupees, day, date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [grocery_name, amount, price_rupees || 0, day, date];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all shopping list items
export const getAllShoppingItems = async () => {
  const query = 'SELECT * FROM shopping_list ORDER BY created_at DESC;';
  const result = await pool.query(query);
  return result.rows;
};

// Get shopping item by ID
export const getShoppingItemById = async (id) => {
  const query = 'SELECT * FROM shopping_list WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Update shopping item
export const updateShoppingItem = async (id, itemData) => {
  const { grocery_name, amount, price_rupees, day, date } = itemData;
  const query = `
    UPDATE shopping_list 
    SET grocery_name = $1, amount = $2, price_rupees = $3, day = $4, date = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *;
  `;
  const values = [grocery_name, amount, price_rupees || 0, day, date, id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Delete shopping item
export const deleteShoppingItem = async (id) => {
  const query = 'DELETE FROM shopping_list WHERE id = $1 RETURNING *;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export default {
  createShoppingItem,
  getAllShoppingItems,
  getShoppingItemById,
  updateShoppingItem,
  deleteShoppingItem,
};

// Initialize table
createShoppingListTable().catch(err => console.error('Error creating shopping_list table:', err));
