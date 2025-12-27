import pool from '../configs/dbConfig.js';
import { INTENTS, ENTITIES } from './intentClassifier.js';

/**
 * Action Executor Service
 * Executes CRUD operations based on classified intent and extracted values
 */

/**
 * Get day name from date
 */
const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

/**
 * Format date as YYYY-MM-DD in local timezone (not UTC)
 */
const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse and format date from various inputs
 */
const parseDate = (dateRef) => {
  if (!dateRef) return new Date();
  
  const lowerRef = String(dateRef).toLowerCase().trim();
  const now = new Date();
  
  if (lowerRef === 'today' || lowerRef === 'now') {
    return now;
  } else if (lowerRef === 'yesterday') {
    now.setDate(now.getDate() - 1);
    return now;
  } else if (lowerRef === 'tomorrow') {
    now.setDate(now.getDate() + 1);
    return now;
  }
  
  // Handle day names (Monday, Tuesday, etc.)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.indexOf(lowerRef);
  if (dayIndex !== -1) {
    const currentDay = now.getDay();
    let daysToAdd = dayIndex - currentDay;
    // If the day is today or in the past this week, assume next week
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    // But if it's exactly today's day name, use today
    if (dayIndex === currentDay) {
      daysToAdd = 0;
    }
    now.setDate(now.getDate() + daysToAdd);
    return now;
  }
  
  // Try parsing as a date string
  const parsed = new Date(dateRef);
  return isNaN(parsed) ? new Date() : parsed;
};

// ============= WORKOUT ACTIONS =============

const addWorkout = async (values) => {
  try {
    const workout_name = values.workout_name || values.name;
    
    if (!workout_name) {
      return { success: false, error: 'Please tell me the workout name. Example: "add squats" or "did 3 sets of bench press"' };
    }
    
    const date = parseDate(values.date);
    const sets = values.sets || null;
    const reps = values.reps || null;
    const weights = values.weights || values.weight || null;

    const day = getDayName(date);
    const dateStr = formatDateLocal(date);

    const result = await pool.query(
      `INSERT INTO workouts (workout_name, sets, reps, weights, day, date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [workout_name, sets, reps, weights, day, dateStr]
    );

    return { success: true, action: 'added', data: result.rows[0], message: `Added workout: ${workout_name}` };
  } catch (error) {
    console.error('❌ [Action] Add workout error:', error.message);
    return { success: false, error: error.message };
  }
};

const deleteWorkout = async (values) => {
  try {
    const { id, name, workout_name } = values;
    const workoutName = name || workout_name;
    
    let result;
    if (id) {
      result = await pool.query(`DELETE FROM workouts WHERE id = $1 RETURNING *`, [id]);
    } else if (workoutName) {
      result = await pool.query(
        `DELETE FROM workouts WHERE LOWER(workout_name) LIKE $1 RETURNING *`,
        [`%${workoutName.toLowerCase()}%`]
      );
    }

    if (result && result.rows.length > 0) {
      return { success: true, action: 'deleted', data: result.rows, message: `Deleted ${result.rows.length} workout(s)` };
    }
    return { success: false, error: 'No matching workout found' };
  } catch (error) {
    console.error('❌ [Action] Delete workout error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============= DIET ACTIONS =============

// Mark meal(s) as eaten - auto-links to today's recipe if available
const markMealAsEaten = async (values) => {
  try {
    const today = new Date();
    const todayDayOfMonth = today.getDate();
    const currentWeek = Math.ceil(todayDayOfMonth / 7);
    const dayInWeek = ((todayDayOfMonth - 1) % 7) + 1;
    const dayStr = `Day ${dayInWeek}`;
    
    // Get meal types to mark (could be single or multiple)
    let mealTypes = [];
    if (values.meal_types && Array.isArray(values.meal_types)) {
      mealTypes = values.meal_types;
    } else if (values.meal_type) {
      mealTypes = [values.meal_type];
    }
    
    if (mealTypes.length === 0) {
      return { success: false, error: 'Please specify which meal(s) you had (breakfast, lunch, snack, dinner)' };
    }
    
    // Normalize meal type names
    mealTypes = mealTypes.map(m => {
      const lower = m.toLowerCase();
      if (lower.includes('break')) return 'Breakfast';
      if (lower.includes('lunch')) return 'Lunch';
      if (lower.includes('snack')) return 'Snack';
      if (lower.includes('dinner')) return 'Dinner';
      return m.charAt(0).toUpperCase() + m.slice(1);
    });
    
    const results = [];
    const alreadyLogged = [];
    
    for (const mealType of mealTypes) {
      // Check if already logged
      const existing = await pool.query(
        `SELECT * FROM diet_logs WHERE meal_type = $1 AND week = $2 AND day = $3`,
        [mealType, currentWeek, dayStr]
      );
      
      if (existing.rows.length > 0) {
        alreadyLogged.push(mealType);
        continue;
      }
      
      // Find recipe for this meal type and day
      const recipeResult = await pool.query(
        `SELECT * FROM food_recipes WHERE day_of_month = $1 AND meal_type = $2`,
        [todayDayOfMonth, mealType]
      );
      
      const recipe = recipeResult.rows[0];
      
      // Log the meal
      const insertResult = await pool.query(
        `INSERT INTO diet_logs (food_name, meal_type, week, day, calories, recipe_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          recipe ? recipe.food_name : mealType,
          mealType,
          currentWeek,
          dayStr,
          recipe?.approx_calories || 0,
          recipe?.id || null
        ]
      );
      
      results.push(insertResult.rows[0]);
    }
    
    if (results.length === 0 && alreadyLogged.length > 0) {
      return { success: true, action: 'skipped', message: `${alreadyLogged.join(', ')} already marked as eaten ✓` };
    }
    
    const markedMeals = results.map(r => r.meal_type).join(', ');
    let message = `Marked ${markedMeals} as eaten! 🍽️`;
    if (alreadyLogged.length > 0) {
      message += ` (${alreadyLogged.join(', ')} was already logged)`;
    }
    
    return { success: true, action: 'added', data: results, message };
  } catch (error) {
    console.error('❌ [Action] Mark meal as eaten error:', error.message);
    return { success: false, error: error.message };
  }
};

const addDietLog = async (values) => {
  try {
    // If action is mark_eaten, use the dedicated function
    if (values.action === 'mark_eaten') {
      return await markMealAsEaten(values);
    }
    
    const {
      food_name = values.name || values.food || 'Food',
      meal_type = values.meal_type || values.meal || 'snack',
      calories = values.calories || 0,
      week = values.week || Math.ceil((new Date().getDate()) / 7),
      day = values.day || getDayName(new Date()),
      recipe_id = values.recipe_id || null
    } = values;

    const result = await pool.query(
      `INSERT INTO diet_logs (food_name, meal_type, week, day, calories, recipe_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [food_name, meal_type, week, day, calories, recipe_id]
    );

    return { success: true, action: 'added', data: result.rows[0], message: `Logged ${food_name} (${calories} cal)` };
  } catch (error) {
    console.error('❌ [Action] Add diet log error:', error.message);
    return { success: false, error: error.message };
  }
};

const deleteDietLog = async (values) => {
  try {
    const { id, food_name, name, meal_type, action } = values;
    const foodName = food_name || name;
    
    // Handle unmark eaten action (remove meal from today's log)
    if (action === 'unmark_eaten' && meal_type) {
      const today = new Date();
      const todayDayOfMonth = today.getDate();
      const currentWeek = Math.ceil(todayDayOfMonth / 7);
      const dayInWeek = ((todayDayOfMonth - 1) % 7) + 1;
      const dayStr = `Day ${dayInWeek}`;
      
      const result = await pool.query(
        `DELETE FROM diet_logs WHERE meal_type = $1 AND week = $2 AND day = $3 RETURNING *`,
        [meal_type, currentWeek, dayStr]
      );
      
      if (result.rows.length > 0) {
        return { success: true, action: 'deleted', data: result.rows, message: `Unmarked ${meal_type} as eaten` };
      }
      return { success: false, error: `${meal_type} was not marked as eaten` };
    }
    
    let result;
    if (id) {
      result = await pool.query(`DELETE FROM diet_logs WHERE id = $1 RETURNING *`, [id]);
    } else if (foodName) {
      result = await pool.query(
        `DELETE FROM diet_logs WHERE LOWER(food_name) LIKE $1 RETURNING *`,
        [`%${foodName.toLowerCase()}%`]
      );
    }

    if (result && result.rows.length > 0) {
      return { success: true, action: 'deleted', data: result.rows, message: `Deleted ${result.rows.length} diet log(s)` };
    }
    return { success: false, error: 'No matching diet log found' };
  } catch (error) {
    console.error('❌ [Action] Delete diet log error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============= STEPS ACTIONS =============

const addSteps = async (values) => {
  try {
    // Handle nested structure: { steps: { steps: 5000 } } or { steps: 5000 }
    const v = values.steps && typeof values.steps === 'object' ? values.steps : values;
    const rawSteps = v.steps || v.count || v.step || 0;
    const stepsCount = parseInt(rawSteps, 10) || 0;
    
    if (stepsCount <= 0) {
      return { success: false, error: 'Please specify a valid number of steps' };
    }
    
    const date = parseDate(v.date || values.date);
    const dateStr = formatDateLocal(date);
    const day = getDayName(date);

    // Check if entry exists for this date
    const existing = await pool.query(
      `SELECT * FROM steps WHERE date = $1`,
      [dateStr]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing entry by adding steps
      result = await pool.query(
        `UPDATE steps SET steps = steps + $1 WHERE date = $2 RETURNING *`,
        [stepsCount, dateStr]
      );
      return { success: true, action: 'updated', data: result.rows[0], message: `Added ${stepsCount} steps. New total: ${result.rows[0].steps}` };
    } else {
      // Create new entry
      result = await pool.query(
        `INSERT INTO steps (day, steps, date) VALUES ($1, $2, $3) RETURNING *`,
        [day, stepsCount, dateStr]
      );
      return { success: true, action: 'added', data: result.rows[0], message: `Logged ${stepsCount} steps for ${day}` };
    }
  } catch (error) {
    console.error('❌ [Action] Add steps error:', error.message);
    return { success: false, error: error.message };
  }
};

const updateSteps = async (values) => {
  try {
    // Handle nested structure: { steps: { steps: 5000 } } or { steps: 5000 }
    const v = values.steps && typeof values.steps === 'object' ? values.steps : values;
    const rawSteps = v.steps || v.count || 0;
    const stepsCount = parseInt(rawSteps, 10) || 0;
    
    if (stepsCount <= 0) {
      return { success: false, error: 'Please specify a valid number of steps' };
    }
    
    const date = parseDate(v.date || values.date);
    const dateStr = formatDateLocal(date);
    const day = getDayName(date);

    // Check if entry exists
    const existing = await pool.query(`SELECT * FROM steps WHERE date = $1`, [dateStr]);

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE steps SET steps = $1 WHERE date = $2 RETURNING *`,
        [stepsCount, dateStr]
      );
      return { success: true, action: 'updated', data: result.rows[0], message: `Updated steps to ${stepsCount}` };
    } else {
      result = await pool.query(
        `INSERT INTO steps (day, steps, date) VALUES ($1, $2, $3) RETURNING *`,
        [day, stepsCount, dateStr]
      );
      return { success: true, action: 'added', data: result.rows[0], message: `Set ${stepsCount} steps for ${day}` };
    }
  } catch (error) {
    console.error('❌ [Action] Update steps error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============= MEASUREMENT ACTIONS =============

// Map common names to database columns
const measurementColumnMap = {
  'weight': 'weight',
  'height': 'height',
  'left bicep': 'left_bicep',
  'leftbicep': 'left_bicep',
  'left_bicep': 'left_bicep',
  'right bicep': 'right_bicep',
  'rightbicep': 'right_bicep',
  'right_bicep': 'right_bicep',
  'left forearm': 'left_forearm',
  'leftforearm': 'left_forearm',
  'left_forearm': 'left_forearm',
  'right forearm': 'right_forearm',
  'rightforearm': 'right_forearm',
  'right_forearm': 'right_forearm',
  'chest': 'chest',
  'neck': 'neck',
  'waist': 'waist',
  'stomach': 'stomach',
  'left leg': 'left_leg',
  'leftleg': 'left_leg',
  'left_leg': 'left_leg',
  'right leg': 'right_leg',
  'rightleg': 'right_leg',
  'right_leg': 'right_leg',
  'left calf': 'left_calf',
  'leftcalf': 'left_calf',
  'left_calf': 'left_calf',
  'right calf': 'right_calf',
  'rightcalf': 'right_calf',
  'right_calf': 'right_calf',
  'shoulder': 'shoulder_width',
  'shoulders': 'shoulder_width',
  'shoulder width': 'shoulder_width',
  'shoulderwidth': 'shoulder_width',
  'shoulder_width': 'shoulder_width',
  // Strength max values
  'bench': 'bench_max',
  'bench press': 'bench_max',
  'benchpress': 'bench_max',
  'bench max': 'bench_max',
  'bench_max': 'bench_max',
  'overhead press': 'overhead_press_max',
  'overheadpress': 'overhead_press_max',
  'ohp': 'overhead_press_max',
  'shoulder press': 'overhead_press_max',
  'overhead press max': 'overhead_press_max',
  'overhead_press_max': 'overhead_press_max',
  'rows': 'rows_max',
  'row': 'rows_max',
  'barbell row': 'rows_max',
  'rows max': 'rows_max',
  'rows_max': 'rows_max',
  'squats': 'squats_max',
  'squat': 'squats_max',
  'squats max': 'squats_max',
  'squat max': 'squats_max',
  'squats_max': 'squats_max',
  'deadlift': 'deadlift_max',
  'deadlifts': 'deadlift_max',
  'deadlift max': 'deadlift_max',
  'deadlift_max': 'deadlift_max',
};

const getMeasurementColumn = (name) => {
  if (!name) return null;
  return measurementColumnMap[name.toLowerCase().trim()] || null;
};

const addMeasurement = async (values) => {
  try {
    // Check if adding a specific measurement by name
    const name = values.name || values.measurement_name;
    const value = values.value || values.measurement_value;
    
    if (name && value !== undefined && value !== null) {
      // Adding a specific measurement (e.g., "add my neck 15")
      const column = getMeasurementColumn(name);
      if (!column) {
        return { success: false, error: `Unknown measurement: ${name}. Valid: weight, height, chest, waist, neck, left/right bicep, left/right forearm, left/right leg, left/right calf, shoulder, stomach` };
      }

      // Get latest measurement to update, or create new if none exists
      const latest = await pool.query(`SELECT * FROM body_measurements ORDER BY created_at DESC LIMIT 1`);
      
      let result;
      if (latest.rows.length === 0) {
        // No existing measurement, create new one
        result = await pool.query(
          `INSERT INTO body_measurements (${column}) VALUES ($1) RETURNING *`,
          [value]
        );
        return { success: true, action: 'added', data: result.rows[0], message: `Added ${name}: ${value}` };
      } else {
        // Update existing measurement
        result = await pool.query(
          `UPDATE body_measurements SET ${column} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
          [value, latest.rows[0].id]
        );
        return { success: true, action: 'updated', data: result.rows[0], message: `Set ${name} to ${value}` };
      }
    }

    // Legacy: adding multiple measurements at once
    const {
      weight = null,
      height = null,
      left_bicep = null,
      right_bicep = null,
      waist = null,
      neck = null,
      chest = null,
    } = values;

    const result = await pool.query(
      `INSERT INTO body_measurements (height, weight, left_bicep, right_bicep, waist, neck, chest)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [height, weight, left_bicep, right_bicep, waist, neck, chest]
    );

    let message = 'Recorded measurements:';
    if (weight) message += ` Weight: ${weight}kg`;
    if (height) message += ` Height: ${height}cm`;

    return { success: true, action: 'added', data: result.rows[0], message };
  } catch (error) {
    console.error('❌ [Action] Add measurement error:', error.message);
    return { success: false, error: error.message };
  }
};

const updateMeasurement = async (values) => {
  try {
    // Get the measurement name and value from extracted values
    const name = values.name || values.measurement_name;
    const value = values.value || values.measurement_value;
    
    if (!name) {
      return { success: false, error: 'Measurement name is required (e.g., weight, height, chest)' };
    }
    
    if (value === undefined || value === null) {
      return { success: false, error: 'Measurement value is required' };
    }

    const column = getMeasurementColumn(name);
    if (!column) {
      return { success: false, error: `Unknown measurement: ${name}. Valid: weight, height, chest, waist, neck, left/right bicep, left/right forearm, left/right leg, left/right calf, shoulder, stomach` };
    }

    // Get latest measurement to update
    const latest = await pool.query(`SELECT * FROM body_measurements ORDER BY created_at DESC LIMIT 1`);
    
    if (latest.rows.length === 0) {
      // No existing measurement, create new one
      const result = await pool.query(
        `INSERT INTO body_measurements (${column}) VALUES ($1) RETURNING *`,
        [value]
      );
      return { success: true, action: 'added', data: result.rows[0], message: `Set ${name} to ${value}` };
    } else {
      // Update existing measurement
      const result = await pool.query(
        `UPDATE body_measurements SET ${column} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [value, latest.rows[0].id]
      );
      return { success: true, action: 'updated', data: result.rows[0], message: `Updated ${name} to ${value}` };
    }
  } catch (error) {
    console.error('❌ [Action] Update measurement error:', error.message);
    return { success: false, error: error.message };
  }
};

const deleteMeasurement = async (values) => {
  try {
    const name = values.name || values.measurement_name;
    
    if (!name) {
      return { success: false, error: 'Please specify which measurement to clear (e.g., "clear neck", "delete weight")' };
    }

    const column = getMeasurementColumn(name);
    if (!column) {
      return { success: false, error: `Unknown measurement: ${name}. Valid: weight, height, chest, waist, neck, left/right bicep, left/right forearm, left/right leg, left/right calf, shoulder, stomach` };
    }

    // Get latest measurement and set the specific field to null
    const latest = await pool.query(`SELECT * FROM body_measurements ORDER BY created_at DESC LIMIT 1`);
    
    if (latest.rows.length === 0) {
      return { success: false, error: 'No measurements found to clear' };
    }

    const currentValue = latest.rows[0][column];
    if (currentValue === null) {
      return { success: true, action: 'none', message: `${name} is already empty` };
    }

    const result = await pool.query(
      `UPDATE body_measurements SET ${column} = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [latest.rows[0].id]
    );
    
    return { success: true, action: 'deleted', data: result.rows[0], message: `Cleared ${name} (was ${currentValue})` };
  } catch (error) {
    console.error('❌ [Action] Delete measurement error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============= RECIPE ACTIONS =============

const addRecipe = async (values) => {
  try {
    // Handle nested recipe object (e.g., { recipe: { food_name: 'eggs', ... } })
    if (values.recipe && typeof values.recipe === 'object' && values.recipe.food_name) {
      values = { ...values, ...values.recipe };
    }
    
    const food_name = values.food_name || values.name || values.recipe_name;
    
    if (!food_name) {
      return { success: false, error: 'Please tell me the recipe name. Example: "add chicken salad recipe"' };
    }

    const {
      week = values.week || 1,
      day = values.day || getDayName(new Date()),
      meal_type = values.meal_type || 'Snack',
      ingredients = values.ingredients || [],
      servings = values.servings || 1,
      recipe = values.recipe || values.instructions || '',
      approx_calories = values.approx_calories || values.calories || null,
      protein = values.protein || null,
      fat = values.fat || null,
      carbs = values.carbs || null,
    } = values;

    // Format ingredients as JSON if it's an array
    const ingredientsJson = Array.isArray(ingredients) 
      ? JSON.stringify(ingredients.map(i => typeof i === 'string' ? { name: i, amount: '' } : i))
      : ingredients;

    const result = await pool.query(
      `INSERT INTO food_recipes (week, day, meal_type, food_name, ingredients, servings, recipe, approx_calories, protein, fat, carbs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [week, day, meal_type, food_name, ingredientsJson, servings, recipe, approx_calories, protein, fat, carbs]
    );

    return { success: true, action: 'added', data: result.rows[0], message: `Added recipe: ${food_name}` };
  } catch (error) {
    console.error('❌ [Action] Add recipe error:', error.message);
    return { success: false, error: error.message };
  }
};

const updateRecipe = async (values) => {
  try {
    const food_name = values.food_name || values.name || values.recipe_name;
    
    if (!food_name) {
      return { success: false, error: 'Recipe name (food_name) is required to identify which recipe to update' };
    }

    // Find the recipe by name
    const existing = await pool.query(
      `SELECT * FROM food_recipes WHERE LOWER(food_name) LIKE $1 ORDER BY created_at DESC LIMIT 1`,
      [`%${food_name.toLowerCase()}%`]
    );

    if (existing.rows.length === 0) {
      return { success: false, error: `No recipe found matching: ${food_name}` };
    }

    const recipeId = existing.rows[0].id;
    const currentRecipe = existing.rows[0];

    // Build update fields - only update what's provided
    const updates = [];
    const updateValues = [];
    let paramIndex = 1;

    if (values.new_name) {
      updates.push(`food_name = $${paramIndex++}`);
      updateValues.push(values.new_name);
    }
    if (values.week !== undefined) {
      updates.push(`week = $${paramIndex++}`);
      updateValues.push(values.week);
    }
    if (values.day) {
      updates.push(`day = $${paramIndex++}`);
      updateValues.push(values.day);
    }
    if (values.meal_type) {
      updates.push(`meal_type = $${paramIndex++}`);
      updateValues.push(values.meal_type);
    }
    if (values.ingredients) {
      const ingredientsJson = Array.isArray(values.ingredients) 
        ? JSON.stringify(values.ingredients.map(i => typeof i === 'string' ? { name: i, amount: '' } : i))
        : values.ingredients;
      updates.push(`ingredients = $${paramIndex++}`);
      updateValues.push(ingredientsJson);
    }
    if (values.servings !== undefined) {
      updates.push(`servings = $${paramIndex++}`);
      updateValues.push(values.servings);
    }
    if (values.recipe || values.instructions) {
      updates.push(`recipe = $${paramIndex++}`);
      updateValues.push(values.recipe || values.instructions);
    }
    if (values.approx_calories !== undefined || values.calories !== undefined) {
      updates.push(`approx_calories = $${paramIndex++}`);
      updateValues.push(values.approx_calories || values.calories);
    }
    if (values.protein !== undefined) {
      updates.push(`protein = $${paramIndex++}`);
      updateValues.push(values.protein);
    }
    if (values.fat !== undefined) {
      updates.push(`fat = $${paramIndex++}`);
      updateValues.push(values.fat);
    }
    if (values.carbs !== undefined) {
      updates.push(`carbs = $${paramIndex++}`);
      updateValues.push(values.carbs);
    }

    if (updates.length === 0) {
      return { success: false, error: 'No fields to update provided' };
    }

    updateValues.push(recipeId);
    const result = await pool.query(
      `UPDATE food_recipes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    );

    return { success: true, action: 'updated', data: result.rows[0], message: `Updated recipe: ${food_name}` };
  } catch (error) {
    console.error('❌ [Action] Update recipe error:', error.message);
    return { success: false, error: error.message };
  }
};

const deleteRecipe = async (values) => {
  try {
    const { id, food_name, name, recipe_name } = values;
    const recipeName = food_name || name || recipe_name;
    
    if (!id && !recipeName) {
      return { success: false, error: 'Recipe name or ID is required to delete' };
    }

    let result;
    if (id) {
      result = await pool.query(`DELETE FROM food_recipes WHERE id = $1 RETURNING *`, [id]);
    } else if (recipeName) {
      result = await pool.query(
        `DELETE FROM food_recipes WHERE LOWER(food_name) LIKE $1 RETURNING *`,
        [`%${recipeName.toLowerCase()}%`]
      );
    }

    if (result && result.rows.length > 0) {
      return { success: true, action: 'deleted', data: result.rows, message: `Deleted ${result.rows.length} recipe(s)` };
    }
    return { success: false, error: 'No matching recipe found' };
  } catch (error) {
    console.error('❌ [Action] Delete recipe error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============= REMINDER ACTIONS =============

/**
 * Parse date string to YYYY-MM-DD format
 * Handles: "25th December", "December 25", "tomorrow", "next Monday", etc.
 */
const parseReminderDate = (dateRef) => {
  if (!dateRef) return formatDateLocal(new Date());
  
  const lowerRef = String(dateRef).toLowerCase().trim();
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Handle relative dates
  if (lowerRef === 'today' || lowerRef === 'now') {
    return formatDateLocal(now);
  } else if (lowerRef === 'tomorrow') {
    now.setDate(now.getDate() + 1);
    return formatDateLocal(now);
  } else if (lowerRef === 'yesterday') {
    now.setDate(now.getDate() - 1);
    return formatDateLocal(now);
  }
  
  // Handle day names (Monday, Tuesday, etc.)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.indexOf(lowerRef.replace('next ', ''));
  if (dayIndex !== -1) {
    const currentDay = now.getDay();
    let daysToAdd = dayIndex - currentDay;
    if (daysToAdd <= 0 || lowerRef.includes('next')) {
      daysToAdd += 7;
    }
    now.setDate(now.getDate() + daysToAdd);
    return formatDateLocal(now);
  }
  
  // Handle month names with day (e.g., "25th December", "December 25", "29th Dec")
  const months = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  };
  
  // Try pattern: "25th December" or "25 Dec"
  const dayMonthMatch = lowerRef.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?(\w+)/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1]);
    const monthStr = dayMonthMatch[2].toLowerCase();
    if (months[monthStr] !== undefined) {
      const targetDate = new Date(currentYear, months[monthStr], day);
      // If date has passed, assume next year
      if (targetDate < now) {
        targetDate.setFullYear(currentYear + 1);
      }
      return formatDateLocal(targetDate);
    }
  }
  
  // Try pattern: "December 25"
  const monthDayMatch = lowerRef.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/);
  if (monthDayMatch) {
    const monthStr = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2]);
    if (months[monthStr] !== undefined) {
      const targetDate = new Date(currentYear, months[monthStr], day);
      if (targetDate < now) {
        targetDate.setFullYear(currentYear + 1);
      }
      return formatDateLocal(targetDate);
    }
  }
  
  // Try parsing as ISO date (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateRef)) {
    return dateRef;
  }
  
  // Default to today
  return formatDateLocal(now);
};

/**
 * Parse time string to HH:MM format
 */
const parseReminderTime = (timeRef) => {
  if (!timeRef) return '09:00';
  
  const timeStr = String(timeRef).toLowerCase().trim();
  
  // Already in HH:MM format
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':');
    return `${hours.padStart(2, '0')}:${minutes}`;
  }
  
  // Handle "3pm", "11am", "6 pm", "11 AM"
  const ampmMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const minutes = ampmMatch[2] || '00';
    const ampm = ampmMatch[3].toLowerCase();
    
    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  // Handle "1500" or "0900"
  if (/^\d{4}$/.test(timeStr)) {
    return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
  }
  
  return '09:00';
};

const addReminder = async (values) => {
  try {
    const reminder_name = values.reminder_name || values.title || values.name;
    
    if (!reminder_name) {
      return { success: false, error: 'Please tell me what to remind you about. Example: "remind me to take vitamins at 8am"' };
    }
    
    const reminder_time = parseReminderTime(values.reminder_time || values.time);
    const date = parseReminderDate(values.date || values.time_reference);
    const day = getDayName(new Date(date));

    const result = await pool.query(
      `INSERT INTO reminders (reminder_name, reminder_time, day, date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [reminder_name, reminder_time, day, date]
    );

    const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { success: true, action: 'added', data: result.rows[0], message: `Created reminder: "${reminder_name}" on ${formattedDate} at ${reminder_time} ⏰` };
  } catch (error) {
    console.error('❌ [Action] Add reminder error:', error.message);
    return { success: false, error: error.message };
  }
};

const updateReminder = async (values) => {
  try {
    const { id, reminder_name, title, name, enabled } = values;
    const searchName = reminder_name || title || name;
    
    // Find the reminder to update
    let reminder;
    if (id) {
      const result = await pool.query(`SELECT * FROM reminders WHERE id = $1`, [id]);
      reminder = result.rows[0];
    } else if (searchName) {
      const result = await pool.query(
        `SELECT * FROM reminders WHERE LOWER(reminder_name) LIKE $1 ORDER BY created_at DESC LIMIT 1`,
        [`%${searchName.toLowerCase()}%`]
      );
      reminder = result.rows[0];
    }
    
    if (!reminder) {
      return { success: false, error: `No reminder found matching "${searchName}"` };
    }
    
    // Handle enable/disable toggle (just return success message, actual toggle is client-side)
    if (enabled !== undefined) {
      const status = enabled ? 'enabled' : 'disabled';
      return { success: true, action: 'updated', data: reminder, message: `Reminder "${reminder.reminder_name}" ${status} ✓` };
    }
    
    // Build update fields
    const newTime = values.reminder_time || values.time ? parseReminderTime(values.reminder_time || values.time) : reminder.reminder_time;
    const newDate = values.date ? parseReminderDate(values.date) : reminder.date;
    const newName = values.new_name || reminder.reminder_name;
    const newDay = getDayName(new Date(newDate));
    
    const result = await pool.query(
      `UPDATE reminders SET reminder_name = $1, reminder_time = $2, day = $3, date = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [newName, newTime, newDay, newDate, reminder.id]
    );
    
    const formattedDate = new Date(newDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { success: true, action: 'updated', data: result.rows[0], message: `Updated reminder: "${newName}" → ${formattedDate} at ${newTime} ✓` };
  } catch (error) {
    console.error('❌ [Action] Update reminder error:', error.message);
    return { success: false, error: error.message };
  }
};

const deleteReminder = async (values) => {
  try {
    const { id, reminder_name, title, name } = values;
    const reminderName = reminder_name || title || name;
    
    let result;
    if (id) {
      result = await pool.query(`DELETE FROM reminders WHERE id = $1 RETURNING *`, [id]);
    } else if (reminderName) {
      result = await pool.query(
        `DELETE FROM reminders WHERE LOWER(reminder_name) LIKE $1 RETURNING *`,
        [`%${reminderName.toLowerCase()}%`]
      );
    }

    if (result && result.rows.length > 0) {
      return { success: true, action: 'deleted', data: result.rows, message: `Deleted reminder: "${result.rows[0].reminder_name}" 🗑️` };
    }
    return { success: false, error: 'No matching reminder found' };
  } catch (error) {
    console.error('❌ [Action] Delete reminder error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============= SHOPPING LIST ACTIONS =============

const addShoppingItem = async (values) => {
  try {
    // Unwrap nested shopping object if present
    const v = values.shopping || values;
    console.log('📝 [Shopping] Received values:', JSON.stringify(v));
    
    const today = new Date();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
    const dateStr = formatDateLocal(today);
    
    // Handle multiple items (e.g., "add milk and eggs to shopping list")
    const items = v.items || [];
    const singleItem = v.item_name || v.name || v.item || v.grocery_name || v.shopping_item || v.product;
    
    if (items.length > 0) {
      // Multiple items
      const results = [];
      for (const itemName of items) {
        const result = await pool.query(
          `INSERT INTO shopping_list (grocery_name, amount, price_rupees, day, date)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [itemName, '1 unit', 0, dayName, dateStr]
        );
        results.push(result.rows[0]);
      }
      return { 
        success: true, 
        action: 'added', 
        data: results, 
        message: `Added ${items.length} items to shopping list: ${items.join(', ')}` 
      };
    } else if (singleItem) {
      // Single item
      const amount = v.quantity || v.amount || '1 unit';
      const price = v.price || v.price_rupees || 0;
      const result = await pool.query(
        `INSERT INTO shopping_list (grocery_name, amount, price_rupees, day, date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [singleItem, amount, price, dayName, dateStr]
      );
      return { success: true, action: 'added', data: result.rows[0], message: `Added to shopping list: ${singleItem}` };
    }
    
    return { success: false, error: 'Please tell me what item to add. Example: "add milk to shopping list"' };
  } catch (error) {
    console.error('❌ [Action] Add shopping item error:', error.message);
    return { success: false, error: error.message };
  }
};

const deleteShoppingItem = async (values) => {
  try {
    // Unwrap nested shopping object if present
    const v = values.shopping || values;
    const { id } = v;
    const itemName = v.item_name || v.name || v.grocery_name;
    
    let result;
    if (id) {
      result = await pool.query(`DELETE FROM shopping_list WHERE id = $1 RETURNING *`, [id]);
    } else if (itemName) {
      result = await pool.query(
        `DELETE FROM shopping_list WHERE LOWER(grocery_name) LIKE $1 RETURNING *`,
        [`%${itemName.toLowerCase()}%`]
      );
    }

    if (result && result.rows.length > 0) {
      return { success: true, action: 'deleted', data: result.rows, message: `Removed from shopping list` };
    }
    return { success: false, error: 'No matching item found' };
  } catch (error) {
    console.error('❌ [Action] Delete shopping item error:', error.message);
    return { success: false, error: error.message };
  }
};

const updateShoppingItem = async (values) => {
  try {
    // Unwrap nested shopping object if present
    const v = values.shopping || values;
    const { id, old_name, new_name, quantity, amount, price, price_rupees } = v;
    const searchName = old_name || v.item_name || v.name || v.grocery_name;
    
    if (!searchName && !id) {
      return { success: false, error: 'Please tell me which item to update. Example: "change milk to almond milk in shopping list"' };
    }
    
    // Find the item first
    let findResult;
    if (id) {
      findResult = await pool.query(`SELECT * FROM shopping_list WHERE id = $1`, [id]);
    } else {
      findResult = await pool.query(
        `SELECT * FROM shopping_list WHERE LOWER(grocery_name) LIKE $1 ORDER BY id DESC LIMIT 1`,
        [`%${searchName.toLowerCase()}%`]
      );
    }
    
    if (!findResult || findResult.rows.length === 0) {
      return { success: false, error: `Could not find "${searchName}" in shopping list` };
    }
    
    const existingItem = findResult.rows[0];
    
    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (new_name) {
      updates.push(`grocery_name = $${paramIndex++}`);
      params.push(new_name);
    }
    if (quantity !== undefined || amount !== undefined) {
      updates.push(`amount = $${paramIndex++}`);
      params.push(String(quantity || amount));
    }
    if (price !== undefined || price_rupees !== undefined) {
      updates.push(`price_rupees = $${paramIndex++}`);
      params.push(price || price_rupees);
    }
    
    if (updates.length === 0) {
      return { success: false, error: 'Please specify what to update (name, amount, or price)' };
    }
    
    params.push(existingItem.id);
    const result = await pool.query(
      `UPDATE shopping_list SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    
    return { success: true, action: 'updated', data: result.rows[0], message: `Updated shopping list item` };
  } catch (error) {
    console.error('❌ [Action] Update shopping item error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============= WISHLIST ACTIONS =============

const addWishlistItem = async (values) => {
  try {
    // Unwrap nested wishlist object if present
    const v = values.wishlist || values;
    const item_name = v.item_name || v.name || v.item;
    
    if (!item_name) {
      return { success: false, error: 'Please tell me what to add to wishlist. Example: "add running shoes to wishlist"' };
    }
    
    const description = v.description || '';
    const category = v.category || null;
    const estimated_price = v.estimated_price || v.price || null;
    const priority = v.priority || 'medium';

    const result = await pool.query(
      `INSERT INTO wishlist (item_name, description, category, estimated_price, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [item_name, description, category, estimated_price, priority]
    );

    return { success: true, action: 'added', data: result.rows[0], message: `Added to wishlist: ${item_name}` };
  } catch (error) {
    console.error('❌ [Action] Add wishlist item error:', error.message);
    return { success: false, error: error.message };
  }
};

const deleteWishlistItem = async (values) => {
  try {
    // Unwrap nested wishlist object if present
    const v = values.wishlist || values;
    const { id, item_name, name } = v;
    const itemName = item_name || name;
    
    let result;
    if (id) {
      result = await pool.query(`DELETE FROM wishlist WHERE id = $1 RETURNING *`, [id]);
    } else if (itemName) {
      result = await pool.query(
        `DELETE FROM wishlist WHERE LOWER(item_name) LIKE $1 RETURNING *`,
        [`%${itemName.toLowerCase()}%`]
      );
    }

    if (result && result.rows.length > 0) {
      return { success: true, action: 'deleted', data: result.rows, message: `Removed from wishlist` };
    }
    return { success: false, error: 'No matching item found' };
  } catch (error) {
    console.error('❌ [Action] Delete wishlist item error:', error.message);
    return { success: false, error: error.message };
  }
};

const updateWishlistItem = async (values) => {
  try {
    // Unwrap nested wishlist object if present
    const v = values.wishlist || values;
    const { id, item_name, name, old_name, new_name, price, estimated_price, category, priority } = v;
    const searchName = old_name || item_name || name;
    
    if (!searchName && !id) {
      return { success: false, error: 'Please tell me which wishlist item to update. Example: "change running shoes price to 5000 in wishlist"' };
    }
    
    // Find the item first
    let findResult;
    if (id) {
      findResult = await pool.query(`SELECT * FROM wishlist WHERE id = $1`, [id]);
    } else {
      findResult = await pool.query(
        `SELECT * FROM wishlist WHERE LOWER(item_name) LIKE $1 ORDER BY id DESC LIMIT 1`,
        [`%${searchName.toLowerCase()}%`]
      );
    }
    
    if (!findResult || findResult.rows.length === 0) {
      return { success: false, error: `Could not find "${searchName}" in wishlist` };
    }
    
    const existingItem = findResult.rows[0];
    
    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (new_name) {
      updates.push(`item_name = $${paramIndex++}`);
      params.push(new_name);
    }
    if (price !== undefined || estimated_price !== undefined) {
      updates.push(`estimated_price = $${paramIndex++}`);
      params.push(price || estimated_price);
    }
    if (category) {
      updates.push(`category = $${paramIndex++}`);
      params.push(category);
    }
    if (priority) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(priority);
    }
    
    if (updates.length === 0) {
      return { success: false, error: 'Please specify what to update (name, price, category, or priority)' };
    }
    
    params.push(existingItem.id);
    const result = await pool.query(
      `UPDATE wishlist SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    
    return { success: true, action: 'updated', data: result.rows[0], message: `Updated wishlist item` };
  } catch (error) {
    console.error('❌ [Action] Update wishlist item error:', error.message);
    return { success: false, error: error.message };
  }
};

// ============= MAIN EXECUTOR =============

/**
 * Execute action based on classification
 * @param {Object} classification - Intent classification
 * @param {Object} actionDetails - Additional details from LLM
 * @returns {Promise<Object>} Action result
 */
export const executeAction = async (classification, actionDetails = null) => {
  const { intent, entity, details } = classification;
  const values = actionDetails || details?.extracted_values || {};
  
  console.log('⚡ [Action] Executing:', intent, 'on', entity, 'with', values);

  // For queries, we don't execute actions, just return context
  if (intent === INTENTS.QUERY || intent === INTENTS.CHAT) {
    return { success: true, action: 'query', message: 'No action needed for query' };
  }

  // Route to appropriate action handler
  const actionMap = {
    [ENTITIES.WORKOUT]: {
      [INTENTS.ADD]: addWorkout,
      [INTENTS.UPDATE]: addWorkout,  // Update creates new entry for workout
      [INTENTS.DELETE]: deleteWorkout,
    },
    [ENTITIES.DIET]: {
      [INTENTS.ADD]: addDietLog,
      [INTENTS.DELETE]: deleteDietLog,
    },
    [ENTITIES.RECIPE]: {
      [INTENTS.ADD]: addRecipe,
      [INTENTS.UPDATE]: updateRecipe,
      [INTENTS.DELETE]: deleteRecipe,
    },
    [ENTITIES.STEPS]: {
      [INTENTS.ADD]: addSteps,
      [INTENTS.UPDATE]: updateSteps,
    },
    [ENTITIES.MEASUREMENT]: {
      [INTENTS.ADD]: addMeasurement,
      [INTENTS.UPDATE]: updateMeasurement,
      [INTENTS.DELETE]: deleteMeasurement,
    },
    [ENTITIES.REMINDER]: {
      [INTENTS.ADD]: addReminder,
      [INTENTS.UPDATE]: updateReminder,
      [INTENTS.DELETE]: deleteReminder,
    },
    [ENTITIES.SHOPPING]: {
      [INTENTS.ADD]: addShoppingItem,
      [INTENTS.UPDATE]: updateShoppingItem,
      [INTENTS.DELETE]: deleteShoppingItem,
    },
    [ENTITIES.WISHLIST]: {
      [INTENTS.ADD]: addWishlistItem,
      [INTENTS.UPDATE]: updateWishlistItem,
      [INTENTS.DELETE]: deleteWishlistItem,
    },
  };

  const entityActions = actionMap[entity];
  if (!entityActions) {
    return { success: false, error: `Unknown entity: ${entity}` };
  }

  const actionHandler = entityActions[intent];
  if (!actionHandler) {
    return { success: false, error: `Unknown action: ${intent} for ${entity}` };
  }

  return await actionHandler(values);
};

export default {
  executeAction,
};
