import pool from '../configs/dbConfig.js';

// Create a new workout
export const createWorkout = async (workoutData) => {
  const { workout_name, sets, reps, weights, day, date } = workoutData;
  const query = `
    INSERT INTO workouts (workout_name, sets, reps, weights, day, date)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [workout_name, sets, reps, weights, day, date];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all workouts
export const getAllWorkouts = async () => {
  const query = 'SELECT * FROM workouts ORDER BY created_at DESC;';
  const result = await pool.query(query);
  return result.rows;
};

// Get workout by ID
export const getWorkoutById = async (id) => {
  const query = 'SELECT * FROM workouts WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Update workout
export const updateWorkout = async (id, workoutData) => {
  const { workout_name, sets, reps, weights, day, date } = workoutData;
  const query = `
    UPDATE workouts 
    SET workout_name = $1, sets = $2, reps = $3, weights = $4, day = $5, date = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *;
  `;
  const values = [workout_name, sets, reps, weights, day, date, id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Delete workout
export const deleteWorkout = async (id) => {
  const query = 'DELETE FROM workouts WHERE id = $1 RETURNING *;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export default {
  createWorkout,
  getAllWorkouts,
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
};
