import {
  createWorkout,
  getAllWorkouts,
  getWorkoutById,
  updateWorkout,
  deleteWorkout,
} from '../models/workoutModel.js';

// Create a new workout
export const create = async (req, res) => {
  try {
    const workout = await createWorkout(req.body);
    res.status(201).json({
      success: true,
      message: 'Workout created successfully',
      data: workout,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating workout',
      error: error.message,
    });
  }
};

// Get all workouts
export const getAll = async (req, res) => {
  try {
    const workouts = await getAllWorkouts();
    res.status(200).json({
      success: true,
      data: workouts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching workouts',
      error: error.message,
    });
  }
};

// Get workout by ID
export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const workout = await getWorkoutById(id);
    
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: workout,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching workout',
      error: error.message,
    });
  }
};

// Update workout
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const workout = await updateWorkout(id, req.body);
    
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Workout updated successfully',
      data: workout,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating workout',
      error: error.message,
    });
  }
};

// Delete workout
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const workout = await deleteWorkout(id);
    
    if (!workout) {
      return res.status(404).json({
        success: false,
        message: 'Workout not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Workout deleted successfully',
      data: workout,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting workout',
      error: error.message,
    });
  }
};
