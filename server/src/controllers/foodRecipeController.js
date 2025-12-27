import {
  createFoodRecipe,
  getAllFoodRecipes,
  getFoodRecipeById,
  getFoodRecipesByWeek,
  getFoodRecipesByDayOfMonth,
  getFoodRecipesByDay,
  checkRecipeExists,
  updateFoodRecipe,
  deleteFoodRecipe,
} from '../models/foodRecipeModel.js';

// Create a new food recipe
export const create = async (req, res) => {
  console.log('📝 [Recipe] Creating new recipe:', req.body.food_name);
  try {
    const recipe = await createFoodRecipe(req.body);
    console.log('✅ [Recipe] Created successfully:', recipe.id);
    res.status(201).json({
      success: true,
      message: 'Food recipe created successfully',
      data: recipe,
    });
  } catch (error) {
    console.error('❌ [Recipe] Error creating:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating food recipe',
      error: error.message,
    });
  }
};

// Get all food recipes
export const getAll = async (req, res) => {
  console.log('📋 [Recipe] Fetching all recipes');
  try {
    const recipes = await getAllFoodRecipes();
    console.log(`✅ [Recipe] Fetched ${recipes.length} records`);
    res.status(200).json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    console.error('❌ [Recipe] Error fetching all:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching food recipes',
      error: error.message,
    });
  }
};

// Get food recipe by ID
export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await getFoodRecipeById(id);
    
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Food recipe not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: recipe,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching food recipe',
      error: error.message,
    });
  }
};

// Get food recipes by week
export const getByWeek = async (req, res) => {
  try {
    const { week } = req.params;
    const recipes = await getFoodRecipesByWeek(week);
    res.status(200).json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching food recipes by week',
      error: error.message,
    });
  }
};

// Get food recipes by day
export const getByDay = async (req, res) => {
  try {
    const { day } = req.params;
    const recipes = await getFoodRecipesByDay(day);
    res.status(200).json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching food recipes by day',
      error: error.message,
    });
  }
};

// Get food recipes by day of month
export const getByDayOfMonth = async (req, res) => {
  try {
    const { dayOfMonth } = req.params;
    const recipes = await getFoodRecipesByDayOfMonth(parseInt(dayOfMonth));
    res.status(200).json({
      success: true,
      data: recipes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching food recipes by day of month',
      error: error.message,
    });
  }
};

// Check if recipe exists for day_of_month/meal_type combination
export const checkDuplicate = async (req, res) => {
  try {
    const { day_of_month, meal_type, excludeId } = req.query;
    const existing = await checkRecipeExists(day_of_month, meal_type, excludeId);
    res.status(200).json({
      success: true,
      exists: existing.length > 0,
      data: existing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking duplicate',
      error: error.message,
    });
  }
};

// Update food recipe
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await updateFoodRecipe(id, req.body);
    
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Food recipe not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Food recipe updated successfully',
      data: recipe,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating food recipe',
      error: error.message,
    });
  }
};

// Delete food recipe
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await deleteFoodRecipe(id);
    
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Food recipe not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Food recipe deleted successfully',
      data: recipe,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting food recipe',
      error: error.message,
    });
  }
};
