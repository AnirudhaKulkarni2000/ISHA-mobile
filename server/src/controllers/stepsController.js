import * as stepsModel from '../models/stepsModel.js';

// Get all steps entries
export const getAllSteps = async (req, res) => {
  try {
    const steps = await stepsModel.getAllSteps();
    res.status(200).json({ success: true, data: steps });
  } catch (error) {
    console.error('Error fetching steps:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch steps', error: error.message });
  }
};

// Get steps by ID
export const getStepsById = async (req, res) => {
  try {
    const { id } = req.params;
    const steps = await stepsModel.getStepsById(id);
    if (!steps) {
      return res.status(404).json({ success: false, message: 'Steps entry not found' });
    }
    res.status(200).json({ success: true, data: steps });
  } catch (error) {
    console.error('Error fetching steps:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch steps', error: error.message });
  }
};

// Get steps by date
export const getStepsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const steps = await stepsModel.getStepsByDate(date);
    res.status(200).json({ success: true, data: steps || null });
  } catch (error) {
    console.error('Error fetching steps by date:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch steps', error: error.message });
  }
};

// Get steps for current week
export const getWeeklySteps = async (req, res) => {
  try {
    const steps = await stepsModel.getWeeklySteps();
    res.status(200).json({ success: true, data: steps });
  } catch (error) {
    console.error('Error fetching weekly steps:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch weekly steps', error: error.message });
  }
};

// Create a new steps entry
export const createSteps = async (req, res) => {
  try {
    const stepsData = req.body;
    if (!stepsData.steps && stepsData.steps !== 0) {
      return res.status(400).json({ success: false, message: 'Steps count is required' });
    }
    const newSteps = await stepsModel.createSteps(stepsData);
    res.status(201).json({ success: true, data: newSteps, message: 'Steps logged successfully' });
  } catch (error) {
    console.error('Error creating steps:', error);
    res.status(500).json({ success: false, message: 'Failed to log steps', error: error.message });
  }
};

// Update steps entry
export const updateSteps = async (req, res) => {
  try {
    const { id } = req.params;
    const stepsData = req.body;
    const updatedSteps = await stepsModel.updateSteps(id, stepsData);
    if (!updatedSteps) {
      return res.status(404).json({ success: false, message: 'Steps entry not found' });
    }
    res.status(200).json({ success: true, data: updatedSteps, message: 'Steps updated successfully' });
  } catch (error) {
    console.error('Error updating steps:', error);
    res.status(500).json({ success: false, message: 'Failed to update steps', error: error.message });
  }
};

// Add steps to today's count (increment)
export const addStepsToday = async (req, res) => {
  try {
    const { steps } = req.body;
    if (!steps && steps !== 0) {
      return res.status(400).json({ success: false, message: 'Steps count is required' });
    }
    const updatedSteps = await stepsModel.addStepsToday(steps);
    res.status(200).json({ success: true, data: updatedSteps, message: 'Steps added successfully' });
  } catch (error) {
    console.error('Error adding steps:', error);
    res.status(500).json({ success: false, message: 'Failed to add steps', error: error.message });
  }
};

// Delete steps entry
export const deleteSteps = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSteps = await stepsModel.deleteSteps(id);
    if (!deletedSteps) {
      return res.status(404).json({ success: false, message: 'Steps entry not found' });
    }
    res.status(200).json({ success: true, data: deletedSteps, message: 'Steps deleted successfully' });
  } catch (error) {
    console.error('Error deleting steps:', error);
    res.status(500).json({ success: false, message: 'Failed to delete steps', error: error.message });
  }
};

// Update goal
export const updateGoal = async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal) {
      return res.status(400).json({ success: false, message: 'Goal is required' });
    }
    const updatedGoal = await stepsModel.updateGoal(goal);
    res.status(200).json({ success: true, data: updatedGoal, message: 'Goal updated successfully' });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ success: false, message: 'Failed to update goal', error: error.message });
  }
};

// Get current goal
export const getGoal = async (req, res) => {
  try {
    const goal = await stepsModel.getGoal();
    res.status(200).json({ success: true, data: goal });
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch goal', error: error.message });
  }
};


// Sync historical steps (bulk upsert)
export const syncHistory = async (req, res) => {
  try {
    const { history } = req.body; // Array of { date: 'YYYY-MM-DD', steps: 1234 }

    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ success: false, message: 'History array is required' });
    }

    console.log(`Processing sync for ${history.length} days of history...`);

    const results = [];
    for (const entry of history) {
      if (entry.date && entry.steps !== undefined) {
        const result = await stepsModel.upsertSteps(entry.date, entry.steps);
        results.push(result);
      }
    }

    res.status(200).json({ success: true, count: results.length, message: 'History synced successfully' });
  } catch (error) {
    console.error('Error syncing history:', error);
    res.status(500).json({ success: false, message: 'Failed to sync history', error: error.message });
  }
};

export default {
  getAllSteps,
  getStepsById,
  getStepsByDate,
  getWeeklySteps,
  createSteps,
  updateSteps,
  addStepsToday,
  deleteSteps,
  updateGoal,
  getGoal,
  syncHistory,
};
