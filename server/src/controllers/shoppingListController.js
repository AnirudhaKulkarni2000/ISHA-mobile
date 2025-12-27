import shoppingListModel from '../models/shoppingListModel.js';

export const create = async (req, res) => {
    try {
        const item = await shoppingListModel.createShoppingItem(req.body);
        res.status(201).json({ message: 'Item created successfully', data: item });
    } catch (error) {
        res.status(500).json({ message: 'Error creating item', error: error.message });
    }
};

export const getAll = async (req, res) => {
    try {
        const items = await shoppingListModel.getAllShoppingItems();
        res.status(200).json({ data: items });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
};

export const getById = async (req, res) => {
    try {
        const item = await shoppingListModel.getShoppingItemById(req.params.id);
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
        const item = await shoppingListModel.updateShoppingItem(req.params.id, req.body);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item updated successfully', data: item });
    } catch (error) {
        res.status(500).json({ message: 'Error updating item', error: error.message });
    }
};

export const remove = async (req, res) => {
    try {
        const item = await shoppingListModel.deleteShoppingItem(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item deleted successfully', data: item });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item', error: error.message });
    }
};
