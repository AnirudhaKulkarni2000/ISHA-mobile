import pool from '../configs/dbConfig.js';

// Create a new diet log entry
export const createDiet = async (dietData) => {
  const { food_name, meal_type, week, day, calories, recipe_id } = dietData;
  const query = `
    INSERT INTO diet_logs (food_name, meal_type, week, day, calories, recipe_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [food_name, meal_type, week, day, calories || 0, recipe_id || null];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all diet log entries
export const getAllDiets = async () => {
  const query = 'SELECT * FROM diet_logs ORDER BY week ASC, day ASC, meal_type ASC;';
  const result = await pool.query(query);
  return result.rows;
};

// Get diet by ID
export const getDietById = async (id) => {
  const query = 'SELECT * FROM diet_logs WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Get diet logs by week and day
export const getDietByWeekDay = async (week, day) => {
  const query = 'SELECT * FROM diet_logs WHERE week = $1 AND day = $2 ORDER BY meal_type ASC;';
  const result = await pool.query(query, [week, day]);
  return result.rows;
};

// Get diet logs by meal type
export const getDietByMealType = async (meal_type) => {
  const query = 'SELECT * FROM diet_logs WHERE meal_type = $1 ORDER BY week ASC, day ASC;';
  const result = await pool.query(query, [meal_type]);
  return result.rows;
};

// Update diet log entry
export const updateDiet = async (id, dietData) => {
  const { food_name, meal_type, week, day, calories, recipe_id } = dietData;
  const query = `
    UPDATE diet_logs 
    SET food_name = $1, meal_type = $2, week = $3, day = $4, calories = $5, recipe_id = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *;
  `;
  const values = [food_name, meal_type, week, day, calories || 0, recipe_id || null, id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Delete diet log entry
export const deleteDiet = async (id) => {
  const query = 'DELETE FROM diet_logs WHERE id = $1 RETURNING *;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export default {
  createDiet,
  getAllDiets,
  getDietById,
  getDietByWeekDay,
  getDietByMealType,
  updateDiet,
  deleteDiet,
};
