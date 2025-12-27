import wishlistModel from '../models/wishlistModel.js';

export const create = async (req, res) => {
    try {
        const item = await wishlistModel.createWishlistItem(req.body);
        res.status(201).json({ message: 'Wishlist item created', data: item });
    } catch (error) {
        res.status(500).json({ message: 'Error creating item', error: error.message });
    }
};

export const getAll = async (req, res) => {
    try {
        const items = await wishlistModel.getAllWishlistItems();
        res.status(200).json({ data: items });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
};

export const getStats = async (req, res) => {
    try {
        const stats = await wishlistModel.getWishlistStats();
        res.status(200).json({ data: stats });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};

export const getById = async (req, res) => {
    try {
        const item = await wishlistModel.getWishlistItemById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ data: item });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching item', error: error.message });
    }
};

export const update = async (req, res) => {
    try {
        const item = await wishlistModel.updateWishlistItem(req.params.id, req.body);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item updated', data: item });
    } catch (error) {
        res.status(500).json({ message: 'Error updating item', error: error.message });
    }
};

export const markPurchased = async (req, res) => {
    try {
        const { actual_price, satisfaction_rating } = req.body;
        const item = await wishlistModel.markAsPurchased(req.params.id, actual_price, satisfaction_rating);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json({ message: 'Item marked as purchased', data: item });
    } catch (error) {
        res.status(500).json({ message: 'Error updating status', error: error.message });
    }
};

export const remove = async (req, res) => {
    try {
        const item = await wishlistModel.deleteWishlistItem(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item deleted', data: item });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item', error: error.message });
    }
};
