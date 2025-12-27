import pool from '../configs/dbConfig.js';

// Helper to format date as YYYY-MM-DD string (avoids timezone issues)
const formatDateForResponse = (row) => {
  if (row && row.date instanceof Date) {
    const year = row.date.getFullYear();
    const month = String(row.date.getMonth() + 1).padStart(2, '0');
    const day = String(row.date.getDate()).padStart(2, '0');
    row.date = `${year}-${month}-${day}`;
  }
  return row;
};

// Create a new reminder
export const createReminder = async (reminderData) => {
  const { reminder_name, reminder_time, day, date } = reminderData;
  const query = `
    INSERT INTO reminders (reminder_name, reminder_time, day, date)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [reminder_name, reminder_time, day, date];
  const result = await pool.query(query, values);
  return formatDateForResponse(result.rows[0]);
};

// Get all reminders
export const getAllReminders = async () => {
  const query = 'SELECT * FROM reminders ORDER BY date ASC, reminder_time ASC;';
  const result = await pool.query(query);
  return result.rows.map(formatDateForResponse);
};

// Get reminder by ID
export const getReminderById = async (id) => {
  const query = 'SELECT * FROM reminders WHERE id = $1;';
  const result = await pool.query(query, [id]);
  return formatDateForResponse(result.rows[0]);
};

// Update reminder
export const updateReminder = async (id, reminderData) => {
  const { reminder_name, reminder_time, day, date } = reminderData;
  const query = `
    UPDATE reminders 
    SET reminder_name = $1, reminder_time = $2, day = $3, date = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *;
  `;
  const values = [reminder_name, reminder_time, day, date, id];
  const result = await pool.query(query, values);
  return formatDateForResponse(result.rows[0]);
};

// Delete reminder
export const deleteReminder = async (id) => {
  const query = 'DELETE FROM reminders WHERE id = $1 RETURNING *;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export default {
  createReminder,
  getAllReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
};
