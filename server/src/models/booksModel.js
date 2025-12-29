import pool from '../configs/dbConfig.js';

// Create books table
export const createBooksTable = async () => {
    const query = `
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      book_name VARCHAR(255) NOT NULL,
      author VARCHAR(255),
      current_page INTEGER DEFAULT 0,
      total_pages INTEGER,
      status VARCHAR(50) DEFAULT 'reading',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
    await pool.query(query);
};

// Create a new book
export const createBook = async (bookData) => {
    const { book_name, author, current_page, total_pages, status } = bookData;
    const query = `
    INSERT INTO books (book_name, author, current_page, total_pages, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
    const result = await pool.query(query, [book_name, author, current_page || 0, total_pages, status || 'reading']);
    return result.rows[0];
};

// Get all books
export const getAllBooks = async () => {
    const query = 'SELECT * FROM books ORDER BY updated_at DESC';
    const result = await pool.query(query);
    return result.rows;
};

// Get book by ID
export const getBookById = async (id) => {
    const query = 'SELECT * FROM books WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

// Update book
export const updateBook = async (id, bookData) => {
    const { book_name, author, current_page, total_pages, status } = bookData;
    const query = `
    UPDATE books
    SET book_name = COALESCE($1, book_name),
        author = COALESCE($2, author),
        current_page = COALESCE($3, current_page),
        total_pages = COALESCE($4, total_pages),
        status = COALESCE($5, status),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
    const result = await pool.query(query, [book_name, author, current_page, total_pages, status, id]);
    return result.rows[0];
};

// Delete book
export const deleteBook = async (id) => {
    const query = 'DELETE FROM books WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

export default {
    createBooksTable,
    createBook,
    getAllBooks,
    getBookById,
    updateBook,
    deleteBook
};

// Initialize table
createBooksTable().catch(err => console.error('Error creating books table:', err));
