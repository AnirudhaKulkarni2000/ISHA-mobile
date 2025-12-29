import * as animeModel from '../models/animeModel.js';

// Get all anime
export const getAllAnime = async (req, res) => {
    try {
        const anime = await animeModel.getAllAnime();
        res.json({ success: true, data: anime });
    } catch (error) {
        console.error('Error fetching anime:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get anime by ID
export const getAnimeById = async (req, res) => {
    try {
        const { id } = req.params;
        const anime = await animeModel.getAnimeById(id);
        if (!anime) {
            return res.status(404).json({ success: false, message: 'Anime not found' });
        }
        res.json({ success: true, data: anime });
    } catch (error) {
        console.error('Error fetching anime:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create anime
export const createAnime = async (req, res) => {
    try {
        const anime = await animeModel.createAnime(req.body);
        res.status(201).json({ success: true, data: anime });
    } catch (error) {
        console.error('Error creating anime:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update anime
export const updateAnime = async (req, res) => {
    try {
        const { id } = req.params;
        const anime = await animeModel.updateAnime(id, req.body);
        if (!anime) {
            return res.status(404).json({ success: false, message: 'Anime not found' });
        }
        res.json({ success: true, data: anime });
    } catch (error) {
        console.error('Error updating anime:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle completion
export const toggleCompleted = async (req, res) => {
    try {
        const { id } = req.params;
        const anime = await animeModel.toggleCompleted(id);
        if (!anime) {
            return res.status(404).json({ success: false, message: 'Anime not found' });
        }
        res.json({ success: true, data: anime });
    } catch (error) {
        console.error('Error toggling anime completion:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete anime
export const deleteAnime = async (req, res) => {
    try {
        const { id } = req.params;
        const anime = await animeModel.deleteAnime(id);
        if (!anime) {
            return res.status(404).json({ success: false, message: 'Anime not found' });
        }
        res.json({ success: true, data: anime, message: 'Anime deleted successfully' });
    } catch (error) {
        console.error('Error deleting anime:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
