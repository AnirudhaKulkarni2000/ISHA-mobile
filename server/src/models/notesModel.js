import pool from '../configs/dbConfig.js';

// Create notes table
export const createNotesTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
    await pool.query(query);
};

// Create a new note
export const createNote = async (noteData) => {
    const { title, content } = noteData;
    const query = `
    INSERT INTO notes (title, content)
    VALUES ($1, $2)
    RETURNING *
  `;
    const result = await pool.query(query, [title, content]);
    return result.rows[0];
};

// Get all notes
export const getAllNotes = async () => {
    const query = 'SELECT * FROM notes ORDER BY updated_at DESC';
    const result = await pool.query(query);
    return result.rows;
};

// Get note by ID
export const getNoteById = async (id) => {
    const query = 'SELECT * FROM notes WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

// Update note
export const updateNote = async (id, noteData) => {
    const { title, content } = noteData;
    const query = `
    UPDATE notes
    SET title = COALESCE($1, title),
        content = COALESCE($2, content),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
    const result = await pool.query(query, [title, content, id]);
    return result.rows[0];
};

// Delete note
export const deleteNote = async (id) => {
    const query = 'DELETE FROM notes WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

export default {
    createNotesTable,
    createNote,
    getAllNotes,
    getNoteById,
    updateNote,
    deleteNote
};

// Initialize table
createNotesTable().catch(err => console.error('Error creating notes table:', err));
