import pool from '../configs/dbConfig.js';

// Initialize the body_measurements table
export const initBodyMeasurementsTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS body_measurements (
      id SERIAL PRIMARY KEY,
      height DECIMAL(5,2),
      weight DECIMAL(5,2),
      left_bicep DECIMAL(5,2),
      right_bicep DECIMAL(5,2),
      left_forearm DECIMAL(5,2),
      right_forearm DECIMAL(5,2),
      left_leg DECIMAL(5,2),
      right_leg DECIMAL(5,2),
      waist DECIMAL(5,2),
      neck DECIMAL(5,2),
      stomach DECIMAL(5,2),
      chest NUMERIC(5,2),
      left_calf NUMERIC(5,2),
      right_calf NUMERIC(5,2),
      shoulder_width NUMERIC(5,2),
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
    await pool.query(query);
};

// Create a new measurement entry
// Create a new measurement entry
export const createMeasurement = async (data) => {
    const {
        height, weight, left_bicep, right_bicep, left_forearm, right_forearm,
        left_leg, right_leg, waist, neck, stomach, chest, left_calf, right_calf, shoulder_width,
        bench_max, overhead_press_max, rows_max, squats_max, deadlift_max
    } = data;

    const query = `
    INSERT INTO body_measurements 
    (height, weight, left_bicep, right_bicep, left_forearm, right_forearm, 
     left_leg, right_leg, waist, neck, stomach, chest, left_calf, right_calf, shoulder_width,
     bench_max, overhead_press_max, rows_max, squats_max, deadlift_max)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *;
  `;
    const values = [
        height || null, weight || null, left_bicep || null, right_bicep || null,
        left_forearm || null, right_forearm || null, left_leg || null, right_leg || null,
        waist || null, neck || null, stomach || null, chest || null, left_calf || null, right_calf || null, shoulder_width || null,
        bench_max || null, overhead_press_max || null, rows_max || null, squats_max || null, deadlift_max || null
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
};

// Get all measurements (for history)
export const getAllMeasurements = async () => {
    const query = 'SELECT * FROM body_measurements ORDER BY recorded_at DESC;';
    const result = await pool.query(query);
    return result.rows;
};

// Get the latest measurement
export const getLatestMeasurement = async () => {
    const query = 'SELECT * FROM body_measurements ORDER BY recorded_at DESC LIMIT 1;';
    const result = await pool.query(query);
    return result.rows[0];
};

// Get measurement by ID
export const getMeasurementById = async (id) => {
    const query = 'SELECT * FROM body_measurements WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

// Update measurement entry
export const updateMeasurement = async (id, data) => {
    const {
        height, weight, left_bicep, right_bicep, left_forearm, right_forearm,
        left_leg, right_leg, waist, neck, stomach, chest, left_calf, right_calf, shoulder_width,
        bench_max, overhead_press_max, rows_max, squats_max, deadlift_max
    } = data;

    const query = `
    UPDATE body_measurements 
    SET height = $1, weight = $2, left_bicep = $3, right_bicep = $4,
        left_forearm = $5, right_forearm = $6, left_leg = $7, right_leg = $8,
        waist = $9, neck = $10, stomach = $11, chest = $12, left_calf = $13, right_calf = $14,
        shoulder_width = $15, bench_max = $16, overhead_press_max = $17, rows_max = $18,
        squats_max = $19, deadlift_max = $20, updated_at = CURRENT_TIMESTAMP
    WHERE id = $21
    RETURNING *;
  `;
    const values = [
        height || null, weight || null, left_bicep || null, right_bicep || null,
        left_forearm || null, right_forearm || null, left_leg || null, right_leg || null,
        waist || null, neck || null, stomach || null, chest || null, left_calf || null, right_calf || null,
        shoulder_width || null, bench_max || null, overhead_press_max || null, rows_max || null,
        squats_max || null, deadlift_max || null, id
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
};

// Delete measurement entry
export const deleteMeasurement = async (id) => {
    const query = 'DELETE FROM body_measurements WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

// Initialize table on module load
initBodyMeasurementsTable().catch(console.error);

export default {
    createMeasurement,
    getAllMeasurements,
    getLatestMeasurement,
    getMeasurementById,
    updateMeasurement,
    deleteMeasurement,
};
