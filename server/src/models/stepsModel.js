import pool from '../configs/dbConfig.js';

// Create a new steps entry
export const createSteps = async (stepsData) => {
  const { day, steps, date } = stepsData;
  const query = `
    INSERT INTO steps (day, steps, date)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [day, steps, date];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all steps entries
export const getAllSteps = async () => {
  const query = 'SELECT * FROM steps ORDER BY date DESC;';
  const result = await pool.query(query);
  return result.rows;
};

// Get steps by ID
export const getStepsById = async (id) => {
  const query = 'SELECT * FROM steps WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Get steps by date
export const getStepsByDate = async (date) => {
  const query = 'SELECT * FROM steps WHERE date = $1;';
  const result = await pool.query(query, [date]);
  return result.rows[0];
};

// Get steps by day
export const getStepsByDay = async (day) => {
  const query = 'SELECT * FROM steps WHERE day = $1;';
  const result = await pool.query(query, [day]);
  return result.rows[0];
};

// Get steps for current week (last 7 days)
export const getWeeklySteps = async () => {
  const query = `
    SELECT * FROM steps 
    WHERE date >= CURRENT_DATE - INTERVAL '6 days' 
    AND date <= CURRENT_DATE
    ORDER BY date ASC;
  `;
  const result = await pool.query(query);
  return result.rows;
};

// Add steps to today (creates or updates)
export const addStepsToday = async (stepsTotal) => {
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = dayNames[today.getDay()];
  const date = today.toISOString().split('T')[0];

  // Check if today's entry exists
  const existing = await getStepsByDate(date);

  if (existing) {
    // Update existing entry - REPLACE the value, don't add to it
    // The client sends the total steps for the day
    const query = `
      UPDATE steps 
      SET steps = $1, updated_at = CURRENT_TIMESTAMP
      WHERE date = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [stepsTotal, date]);
    return result.rows[0];
  } else {
    // Create new entry
    return createSteps({ day, steps: stepsTotal, date });
  }
};

// Update steps entry
export const updateSteps = async (id, stepsData) => {
  const { day, steps, date } = stepsData;
  const query = `
    UPDATE steps 
    SET day = $1, steps = $2, date = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *;
  `;
  const values = [day, steps, date, id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Delete steps entry
export const deleteSteps = async (id) => {
  const query = 'DELETE FROM steps WHERE id = $1 RETURNING *;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Get step goal (from settings or default)
export const getGoal = async () => {
  const query = `SELECT * FROM step_goal LIMIT 1;`;
  try {
    const result = await pool.query(query);
    return result.rows[0]?.goal || 10000;
  } catch (error) {
    return 10000; // Default goal
  }
};

// Update step goal
export const updateGoal = async (goal) => {
  // Create step_goal table if not exists and upsert
  await pool.query(`
    CREATE TABLE IF NOT EXISTS step_goal (
      id SERIAL PRIMARY KEY,
      goal INTEGER DEFAULT 10000,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const checkQuery = 'SELECT * FROM step_goal LIMIT 1;';
  const existing = await pool.query(checkQuery);

  if (existing.rows.length > 0) {
    const query = `
      UPDATE step_goal 
      SET goal = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [goal, existing.rows[0].id]);
    return result.rows[0];
  } else {
    const query = `
      INSERT INTO step_goal (goal)
      VALUES ($1)
      RETURNING *;
    `;
    const result = await pool.query(query, [goal]);
    return result.rows[0];
  }
};

export default {
  createSteps,
  getAllSteps,
  getStepsById,
  getStepsByDate,
  getStepsByDay,
  getWeeklySteps,
  addStepsToday,
  updateSteps,
  deleteSteps,
  getGoal,
  updateGoal,
};
