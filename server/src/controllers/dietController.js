import {
  createDiet,
  getAllDiets,
  getDietById,
  getDietByWeekDay,
  getDietByMealType,
  updateDiet,
  deleteDiet,
} from '../models/dietModel.js';

// Create a new diet log entry
export const create = async (req, res) => {
  console.log('📝 [Diet] Creating new diet log:', req.body);
  try {
    const diet = await createDiet(req.body);
    console.log('✅ [Diet] Created successfully:', diet.id);
    res.status(201).json({
      success: true,
      message: 'Diet log created successfully',
      data: diet,
    });
  } catch (error) {
    console.error('❌ [Diet] Error creating:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating diet log',
      error: error.message,
    });
  }
};

// Get all diet log entries
export const getAll = async (req, res) => {
  console.log('📋 [Diet] Fetching all diet logs');
  try {
    const diets = await getAllDiets();
    console.log(`✅ [Diet] Fetched ${diets.length} records`);
    res.status(200).json({
      success: true,
      data: diets,
    });
  } catch (error) {
    console.error('❌ [Diet] Error fetching all:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching diet logs',
      error: error.message,
    });
  }
};

// Get diet by ID
export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const diet = await getDietById(id);
    
    if (!diet) {
      return res.status(404).json({
        success: false,
        message: 'Diet log not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: diet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching diet log',
      error: error.message,
    });
  }
};

// Get diet by week and day
export const getByWeekDay = async (req, res) => {
  try {
    const { week, day } = req.params;
    const diets = await getDietByWeekDay(week, day);
    res.status(200).json({
      success: true,
      data: diets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching diet logs',
      error: error.message,
    });
  }
};

// Get diet by meal type
export const getByMealType = async (req, res) => {
  try {
    const { mealType } = req.params;
    const diets = await getDietByMealType(mealType);
    res.status(200).json({
      success: true,
      data: diets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching diet logs',
      error: error.message,
    });
  }
};

// Update diet log entry
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const diet = await updateDiet(id, req.body);
    
    if (!diet) {
      return res.status(404).json({
        success: false,
        message: 'Diet entry not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Diet entry updated successfully',
      data: diet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating diet entry',
      error: error.message,
    });
  }
};

// Delete diet entry
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const diet = await deleteDiet(id);
    
    if (!diet) {
      return res.status(404).json({
        success: false,
        message: 'Diet entry not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Diet entry deleted successfully',
      data: diet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting diet entry',
      error: error.message,
    });
  }
};
