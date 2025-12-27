import pool from '../configs/dbConfig.js';

// Create wishlist table
export const createWishlistTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      item_name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      estimated_price DECIMAL(10, 2),
      actual_price DECIMAL(10, 2),
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(50) DEFAULT 'wished',
      satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
      purchase_date DATE,
      notes TEXT,
      image_url TEXT,
      link_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await pool.query(query);
};

// Create a new wishlist item
export const createWishlistItem = async (itemData) => {
  const {
    item_name,
    description,
    category,
    estimated_price,
    priority,
    notes,
    image_url,
    link_url
  } = itemData;

  const query = `
    INSERT INTO wishlist (item_name, description, category, estimated_price, priority, notes, image_url, link_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  const values = [item_name, description, category, estimated_price, priority, notes, image_url, link_url];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all wishlist items
export const getAllWishlistItems = async () => {
  const query = 'SELECT * FROM wishlist ORDER BY created_at DESC';
  const result = await pool.query(query);
  return result.rows;
};

// Get wishlist items by status (wished, purchased, fulfilled)
export const getWishlistByStatus = async (status) => {
  const query = 'SELECT * FROM wishlist WHERE status = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [status]);
  return result.rows;
};

// Get wishlist items by priority
export const getWishlistByPriority = async (priority) => {
  const query = 'SELECT * FROM wishlist WHERE priority = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [priority]);
  return result.rows;
};

// Get wishlist items by category
export const getWishlistByCategory = async (category) => {
  const query = 'SELECT * FROM wishlist WHERE category = $1 ORDER BY created_at DESC';
  const result = await pool.query(query, [category]);
  return result.rows;
};

// Get wishlist item by ID
export const getWishlistItemById = async (id) => {
  const query = 'SELECT * FROM wishlist WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Update wishlist item
export const updateWishlistItem = async (id, itemData) => {
  const {
    item_name,
    description,
    category,
    estimated_price,
    actual_price,
    priority,
    status,
    satisfaction_rating,
    purchase_date,
    notes,
    image_url,
    link_url
  } = itemData;

  const query = `
    UPDATE wishlist
    SET item_name = COALESCE($1, item_name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        estimated_price = COALESCE($4, estimated_price),
        actual_price = COALESCE($5, actual_price),
        priority = COALESCE($6, priority),
        status = COALESCE($7, status),
        satisfaction_rating = COALESCE($8, satisfaction_rating),
        purchase_date = COALESCE($9, purchase_date),
        notes = COALESCE($10, notes),
        image_url = COALESCE($11, image_url),
        link_url = COALESCE($12, link_url),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $13
    RETURNING *
  `;
  const values = [
    item_name, description, category, estimated_price, actual_price,
    priority, status, satisfaction_rating, purchase_date, notes,
    image_url, link_url, id
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Mark item as purchased with satisfaction rating
export const markAsPurchased = async (id, actual_price, satisfaction_rating) => {
  const query = `
    UPDATE wishlist
    SET status = 'purchased',
        actual_price = $1,
        satisfaction_rating = $2,
        purchase_date = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [actual_price, satisfaction_rating, id]);
  return result.rows[0];
};

// Mark item as fulfilled (wish came true without purchase)
export const markAsFulfilled = async (id, satisfaction_rating, notes) => {
  const query = `
    UPDATE wishlist
    SET status = 'fulfilled',
        satisfaction_rating = $1,
        notes = COALESCE($2, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const result = await pool.query(query, [satisfaction_rating, notes, id]);
  return result.rows[0];
};

// Delete wishlist item
export const deleteWishlistItem = async (id) => {
  const query = 'DELETE FROM wishlist WHERE id = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Get wishlist statistics
export const getWishlistStats = async () => {
  const query = `
    SELECT 
      COUNT(*) as total_items,
      COUNT(CASE WHEN status = 'wished' THEN 1 END) as wished_count,
      COUNT(CASE WHEN status = 'purchased' THEN 1 END) as purchased_count,
      COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled_count,
      COALESCE(SUM(estimated_price), 0) as total_estimated_value,
      COALESCE(SUM(CASE WHEN status = 'purchased' THEN actual_price ELSE 0 END), 0) as total_spent,
      COALESCE(AVG(CASE WHEN satisfaction_rating IS NOT NULL THEN satisfaction_rating END), 0) as avg_satisfaction
    FROM wishlist
  `;
  const result = await pool.query(query);
  return result.rows[0];
};

// Get high satisfaction purchases (for tracking what brings joy)
export const getHighSatisfactionItems = async (minRating = 4) => {
  const query = `
    SELECT * FROM wishlist 
    WHERE satisfaction_rating >= $1 
    AND status IN ('purchased', 'fulfilled')
    ORDER BY satisfaction_rating DESC, purchase_date DESC
  `;
  const result = await pool.query(query, [minRating]);
  return result.rows;
};

export default {
  createWishlistTable,
  createWishlistItem,
  getAllWishlistItems,
  getWishlistByStatus,
  getWishlistByPriority,
  getWishlistByCategory,
  getWishlistItemById,
  updateWishlistItem,
  markAsPurchased,
  markAsFulfilled,
  deleteWishlistItem,
  getWishlistStats,
  getHighSatisfactionItems
};

// Initialize table
createWishlistTable().catch(err => console.error('Error creating wishlist table:', err));
