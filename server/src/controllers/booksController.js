import * as booksModel from '../models/booksModel.js';

// Get all books
export const getAllBooks = async (req, res) => {
    try {
        const books = await booksModel.getAllBooks();
        res.json({ success: true, data: books });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get book by ID
export const getBookById = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await booksModel.getBookById(id);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        res.json({ success: true, data: book });
    } catch (error) {
        console.error('Error fetching book:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create book
export const createBook = async (req, res) => {
    try {
        const book = await booksModel.createBook(req.body);
        res.status(201).json({ success: true, data: book });
    } catch (error) {
        console.error('Error creating book:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update book
export const updateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await booksModel.updateBook(id, req.body);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        res.json({ success: true, data: book });
    } catch (error) {
        console.error('Error updating book:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete book
export const deleteBook = async (req, res) => {
    try {
        const { id } = req.params;
        const book = await booksModel.deleteBook(id);
        if (!book) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        res.json({ success: true, data: book, message: 'Book deleted successfully' });
    } catch (error) {
        console.error('Error deleting book:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
