import pool from '../configs/dbConfig.js';

// Create a new food recipe
export const createFoodRecipe = async (recipeData) => {
  const { week, day, day_of_month, meal_type, food_name, ingredients, servings, recipe, approx_calories, protein, fat, carbs } = recipeData;
  const query = `
    INSERT INTO food_recipes (week, day, meal_type, food_name, ingredients, servings, recipe, approx_calories, protein, fat, carbs)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *, ((week - 1) * 7 + 
      CASE day 
        WHEN 'Day 1' THEN 1 WHEN 'Day 2' THEN 2 WHEN 'Day 3' THEN 3 
        WHEN 'Day 4' THEN 4 WHEN 'Day 5' THEN 5 WHEN 'Day 6' THEN 6 WHEN 'Day 7' THEN 7
        WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 
        WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7
        ELSE 1 
      END) as day_of_month;
  `;
  const values = [week, day, meal_type, food_name, JSON.stringify(ingredients || []), servings || 1, recipe, approx_calories || null, protein || 0, fat || 0, carbs || 0];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get all food recipes
export const getAllFoodRecipes = async () => {
  const query = `
    SELECT *, 
      ((week - 1) * 7 + 
        CASE day 
          WHEN 'Day 1' THEN 1 WHEN 'Day 2' THEN 2 WHEN 'Day 3' THEN 3 
          WHEN 'Day 4' THEN 4 WHEN 'Day 5' THEN 5 WHEN 'Day 6' THEN 6 WHEN 'Day 7' THEN 7
          WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 
          WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7
          ELSE 1 
        END) as day_of_month
    FROM food_recipes 
    ORDER BY week ASC, day ASC, meal_type ASC, created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
};

// Get food recipe by ID
export const getFoodRecipeById = async (id) => {
  const query = `
    SELECT *, 
      ((week - 1) * 7 + 
        CASE day 
          WHEN 'Day 1' THEN 1 WHEN 'Day 2' THEN 2 WHEN 'Day 3' THEN 3 
          WHEN 'Day 4' THEN 4 WHEN 'Day 5' THEN 5 WHEN 'Day 6' THEN 6 WHEN 'Day 7' THEN 7
          WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 
          WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7
          ELSE 1 
        END) as day_of_month
    FROM food_recipes WHERE id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Get food recipes by week
export const getFoodRecipesByWeek = async (week) => {
  const query = `
    SELECT *, 
      ((week - 1) * 7 + 
        CASE day 
          WHEN 'Day 1' THEN 1 WHEN 'Day 2' THEN 2 WHEN 'Day 3' THEN 3 
          WHEN 'Day 4' THEN 4 WHEN 'Day 5' THEN 5 WHEN 'Day 6' THEN 6 WHEN 'Day 7' THEN 7
          WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 
          WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7
          ELSE 1 
        END) as day_of_month
    FROM food_recipes WHERE week = $1 ORDER BY day ASC, meal_type ASC;
  `;
  const result = await pool.query(query, [week]);
  return result.rows;
};

// Get food recipes by day of month (calculated)
export const getFoodRecipesByDayOfMonth = async (dayOfMonth) => {
  const week = Math.ceil(dayOfMonth / 7);
  const dayInWeek = ((dayOfMonth - 1) % 7) + 1;
  const dayName = `Day ${dayInWeek}`;
  
  const query = `
    SELECT *, $3::integer as day_of_month
    FROM food_recipes 
    WHERE week = $1 AND day = $2 
    ORDER BY meal_type ASC;
  `;
  const result = await pool.query(query, [week, dayName, dayOfMonth]);
  return result.rows;
};

// Get food recipes by day (legacy support)
export const getFoodRecipesByDay = async (day) => {
  const query = 'SELECT * FROM food_recipes WHERE day = $1 ORDER BY created_at DESC;';
  const result = await pool.query(query, [day]);
  return result.rows;
};

// Check if recipe exists for day_of_month, meal_type combination
export const checkRecipeExists = async (day_of_month, meal_type, excludeId = null) => {
  const week = Math.ceil(day_of_month / 7);
  const dayInWeek = ((day_of_month - 1) % 7) + 1;
  const dayName = `Day ${dayInWeek}`;
  
  let query = 'SELECT * FROM food_recipes WHERE week = $1 AND day = $2 AND meal_type = $3';
  const values = [week, dayName, meal_type];
  
  if (excludeId) {
    query += ' AND id != $4';
    values.push(excludeId);
  }
  
  const result = await pool.query(query, values);
  return result.rows;
};

// Update food recipe
export const updateFoodRecipe = async (id, recipeData) => {
  const { week, day, meal_type, food_name, ingredients, servings, recipe, approx_calories, protein, fat, carbs } = recipeData;
  const query = `
    UPDATE food_recipes 
    SET week = $1, day = $2, meal_type = $3, food_name = $4, ingredients = $5, servings = $6, recipe = $7, approx_calories = $8, protein = $9, fat = $10, carbs = $11, updated_at = CURRENT_TIMESTAMP
    WHERE id = $12
    RETURNING *, ((week - 1) * 7 + 
      CASE day 
        WHEN 'Day 1' THEN 1 WHEN 'Day 2' THEN 2 WHEN 'Day 3' THEN 3 
        WHEN 'Day 4' THEN 4 WHEN 'Day 5' THEN 5 WHEN 'Day 6' THEN 6 WHEN 'Day 7' THEN 7
        WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 
        WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7
        ELSE 1 
      END) as day_of_month;
  `;
  const values = [week, day, meal_type, food_name, JSON.stringify(ingredients || []), servings || 1, recipe, approx_calories || null, protein || 0, fat || 0, carbs || 0, id];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Delete food recipe
export const deleteFoodRecipe = async (id) => {
  const query = 'DELETE FROM food_recipes WHERE id = $1 RETURNING *;';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export default {
  createFoodRecipe,
  getAllFoodRecipes,
  getFoodRecipeById,
  getFoodRecipesByWeek,
  getFoodRecipesByDayOfMonth,
  getFoodRecipesByDay,
  checkRecipeExists,
  updateFoodRecipe,
  deleteFoodRecipe,
};
