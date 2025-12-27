import pool from '../configs/dbConfig.js';

// Create progress table
export const createProgressTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS progress (
      id SERIAL PRIMARY KEY,
      image_url TEXT NOT NULL,
      captured_at TIMESTAMP NOT NULL,
      day_of_week VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await pool.query(query);
};

// Create a new progress entry
export const createProgressEntry = async (entryData) => {
  const { image_url, captured_at } = entryData;
  
  const date = new Date(captured_at || new Date());
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day_of_week = days[date.getDay()];

  const query = `
    INSERT INTO progress (image_url, captured_at, day_of_week)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const values = [image_url, captured_at || new Date(), day_of_week];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all progress entries
export const getAllProgressEntries = async () => {
  const query = `SELECT * FROM progress ORDER BY captured_at DESC`;
  const result = await pool.query(query);
  return result.rows;
};

// Get progress entries by date range
export const getProgressByDateRange = async (startDate, endDate) => {
  const query = `
    SELECT * FROM progress 
    WHERE captured_at BETWEEN $1 AND $2 
    ORDER BY captured_at DESC
  `;
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
};

// Get a single progress entry by ID
export const getProgressEntryById = async (id) => {
  const query = `SELECT * FROM progress WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Delete a progress entry
export const deleteProgressEntry = async (id) => {
  const query = `DELETE FROM progress WHERE id = $1 RETURNING *`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Get progress stats
export const getProgressStats = async () => {
  const query = `
    SELECT 
      COUNT(*) as total_entries,
      MIN(captured_at) as first_entry,
      MAX(captured_at) as latest_entry
    FROM progress
  `;
  const result = await pool.query(query);
  return result.rows[0];
};

export default {
  createProgressTable,
  createProgressEntry,
  getAllProgressEntries,
  getProgressByDateRange,
  getProgressEntryById,
  deleteProgressEntry,
  getProgressStats
};
