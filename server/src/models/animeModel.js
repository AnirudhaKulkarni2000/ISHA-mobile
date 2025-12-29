import pool from '../configs/dbConfig.js';

// Create anime table
export const createAnimeTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS anime (
      id SERIAL PRIMARY KEY,
      anime_name VARCHAR(255) NOT NULL,
      is_completed BOOLEAN DEFAULT false,
      episodes_watched INTEGER DEFAULT 0,
      total_episodes INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
    await pool.query(query);
};

// Create a new anime entry
export const createAnime = async (animeData) => {
    const { anime_name, is_completed, episodes_watched, total_episodes, notes } = animeData;
    const query = `
    INSERT INTO anime (anime_name, is_completed, episodes_watched, total_episodes, notes)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
    const result = await pool.query(query, [anime_name, is_completed || false, episodes_watched || 0, total_episodes, notes]);
    return result.rows[0];
};

// Get all anime
export const getAllAnime = async () => {
    const query = 'SELECT * FROM anime ORDER BY is_completed ASC, updated_at DESC';
    const result = await pool.query(query);
    return result.rows;
};

// Get anime by ID
export const getAnimeById = async (id) => {
    const query = 'SELECT * FROM anime WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

// Update anime
export const updateAnime = async (id, animeData) => {
    const { anime_name, is_completed, episodes_watched, total_episodes, notes } = animeData;
    const query = `
    UPDATE anime
    SET anime_name = COALESCE($1, anime_name),
        is_completed = COALESCE($2, is_completed),
        episodes_watched = COALESCE($3, episodes_watched),
        total_episodes = COALESCE($4, total_episodes),
        notes = COALESCE($5, notes),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
    const result = await pool.query(query, [anime_name, is_completed, episodes_watched, total_episodes, notes, id]);
    return result.rows[0];
};

// Toggle completion
export const toggleCompleted = async (id) => {
    const query = `
    UPDATE anime
    SET is_completed = NOT is_completed,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

// Delete anime
export const deleteAnime = async (id) => {
    const query = 'DELETE FROM anime WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

export default {
    createAnimeTable,
    createAnime,
    getAllAnime,
    getAnimeById,
    updateAnime,
    toggleCompleted,
    deleteAnime
};

// Initialize table
createAnimeTable().catch(err => console.error('Error creating anime table:', err));
