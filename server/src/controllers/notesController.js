import * as notesModel from '../models/notesModel.js';

// Get all notes
export const getAllNotes = async (req, res) => {
    try {
        const notes = await notesModel.getAllNotes();
        res.json({ success: true, data: notes });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get note by ID
export const getNoteById = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await notesModel.getNoteById(id);
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }
        res.json({ success: true, data: note });
    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create note
export const createNote = async (req, res) => {
    try {
        const note = await notesModel.createNote(req.body);
        res.status(201).json({ success: true, data: note });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update note
export const updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await notesModel.updateNote(id, req.body);
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }
        res.json({ success: true, data: note });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete note
export const deleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        const note = await notesModel.deleteNote(id);
        if (!note) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }
        res.json({ success: true, data: note, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
