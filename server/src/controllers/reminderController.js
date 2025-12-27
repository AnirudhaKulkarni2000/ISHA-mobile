import {
  createReminder,
  getAllReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
} from '../models/reminderModel.js';

// Create a new reminder
export const create = async (req, res) => {
  try {
    const reminder = await createReminder(req.body);
    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: reminder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating reminder',
      error: error.message,
    });
  }
};

// Get all reminders
export const getAll = async (req, res) => {
  try {
    const reminders = await getAllReminders();
    res.status(200).json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reminders',
      error: error.message,
    });
  }
};

// Get reminder by ID
export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await getReminderById(id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reminder',
      error: error.message,
    });
  }
};

// Update reminder
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await updateReminder(id, req.body);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Reminder updated successfully',
      data: reminder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating reminder',
      error: error.message,
    });
  }
};

// Delete reminder
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const reminder = await deleteReminder(id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully',
      data: reminder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting reminder',
      error: error.message,
    });
  }
};
