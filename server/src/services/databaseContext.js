import pool from '../configs/dbConfig.js';
import * as booksModel from '../models/booksModel.js';
import * as animeModel from '../models/animeModel.js';

/**
 * Build database context based on classified intent and entity
 * This fetches relevant data to provide context to the LLM for generating responses
 */

/**
 * Get the current day name (Monday, Tuesday, etc.)
 */
const getCurrentDayName = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};

/**
 * Get today's date formatted as YYYY-MM-DD
 */
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Get date range based on time reference
 * @param {string} timeRef - Time reference like "today", "this week", "yesterday"
 * @returns {Object} Start and end dates
 */
const getDateRange = (timeRef) => {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  if (!timeRef) {
    // Default to today
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  const lowerRef = timeRef.toLowerCase();

  if (lowerRef.includes('today') || lowerRef.includes('now')) {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (lowerRef.includes('yesterday')) {
    startDate.setDate(now.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setDate(now.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  } else if (lowerRef.includes('week')) {
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (lowerRef.includes('month')) {
    startDate.setDate(now.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Default to all time for general queries
    startDate = new Date('2020-01-01');
    endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
};

/**
 * Fetch workout data - Updated to match actual schema
 */
const getWorkoutContext = async (timeRef, limit = 20) => {
  try {
    // Get all workouts (your schema uses day/date columns, not timestamp filtering)
    const result = await pool.query(
      `SELECT * FROM workouts ORDER BY date DESC, id DESC LIMIT $1`,
      [limit]
    );

    // Get summary stats
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_workouts,
        COUNT(DISTINCT date) as workout_days
       FROM workouts`
    );

    return {
      workouts: result.rows,
      summary: statsResult.rows[0],
      message: `Found ${result.rows.length} workouts`
    };
  } catch (error) {
    console.error('❌ [Context] Workout fetch error:', error.message);
    return { workouts: [], summary: {}, error: error.message };
  }
};

/**
 * Fetch diet/food log data - Updated to match actual schema
 */
const getDietContext = async (timeRef, limit = 30) => {
  try {
    // Get diet logs (schema uses week/day/meal_type)
    const result = await pool.query(
      `SELECT * FROM diet_logs ORDER BY week DESC, day DESC LIMIT $1`,
      [limit]
    );

    // Get nutrition summary
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_meals,
        SUM(calories) as total_calories,
        AVG(calories) as avg_calories
       FROM diet_logs`
    );

    return {
      meals: result.rows,
      nutrition: statsResult.rows[0],
      message: `Found ${result.rows.length} diet entries`
    };
  } catch (error) {
    console.error('❌ [Context] Diet fetch error:', error.message);
    return { meals: [], nutrition: {}, error: error.message };
  }
};

/**
 * Fetch recipe data
 */
const getRecipeContext = async (searchTerm = null, limit = 10) => {
  try {
    let result;
    if (searchTerm) {
      result = await pool.query(
        `SELECT * FROM food_recipes 
         WHERE LOWER(name) LIKE $1 OR LOWER(category) LIKE $1
         ORDER BY created_at DESC 
         LIMIT $2`,
        [`%${searchTerm.toLowerCase()}%`, limit]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM food_recipes ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
    }

    return { recipes: result.rows, message: `Found ${result.rows.length} recipes` };
  } catch (error) {
    console.error('❌ [Context] Recipe fetch error:', error.message);
    return { recipes: [], error: error.message };
  }
};

/**
 * Fetch reminder data
 */
const getReminderContext = async () => {
  try {
    const result = await pool.query(
      `SELECT * FROM reminders ORDER BY reminder_time ASC`
    );
    return { reminders: result.rows, message: `Found ${result.rows.length} reminders` };
  } catch (error) {
    console.error('❌ [Context] Reminder fetch error:', error.message);
    return { reminders: [], error: error.message };
  }
};

/**
 * Fetch steps data - Updated to match actual schema (day, steps, date)
 */
const getStepsContext = async (timeRef, limit = 30) => {
  try {
    const result = await pool.query(
      `SELECT * FROM steps ORDER BY date DESC LIMIT $1`,
      [limit]
    );

    // Get summary
    const statsResult = await pool.query(
      `SELECT 
        SUM(steps) as total_steps,
        AVG(steps) as avg_steps,
        MAX(steps) as max_steps,
        COUNT(*) as days_tracked
       FROM steps`
    );

    // Get today's steps
    const todayResult = await pool.query(
      `SELECT * FROM steps WHERE date = CURRENT_DATE`
    );

    return {
      steps: result.rows,
      summary: statsResult.rows[0],
      today: todayResult.rows[0] || null,
      message: `Found ${result.rows.length} step entries. Today: ${todayResult.rows[0]?.steps || 0} steps`
    };
  } catch (error) {
    console.error('❌ [Context] Steps fetch error:', error.message);
    return { steps: [], summary: {}, error: error.message };
  }
};

/**
 * Fetch body measurements data - Updated to match actual schema
 */
const getMeasurementContext = async (limit = 10) => {
  try {
    const result = await pool.query(
      `SELECT * FROM body_measurements ORDER BY recorded_at DESC LIMIT $1`,
      [limit]
    );

    // Get latest measurement
    const latestResult = await pool.query(
      `SELECT * FROM body_measurements ORDER BY recorded_at DESC LIMIT 1`
    );

    const latest = latestResult.rows[0];
    let bmi = null;
    if (latest?.weight && latest?.height) {
      const heightM = parseFloat(latest.height) / 100; // cm to m
      bmi = (parseFloat(latest.weight) / (heightM * heightM)).toFixed(1);
    }

    return {
      measurements: result.rows,
      latest: latest || null,
      bmi: bmi,
      message: latest
        ? `Latest: Weight ${latest.weight}kg, Height ${latest.height}cm, BMI: ${bmi || 'N/A'}`
        : 'No measurements recorded yet'
    };
  } catch (error) {
    console.error('❌ [Context] Measurement fetch error:', error.message);
    return { measurements: [], latest: null, error: error.message };
  }
};

/**
 * Fetch shopping list data
 */
const getShoppingContext = async () => {
  try {
    const result = await pool.query(
      `SELECT * FROM shopping_list ORDER BY is_purchased ASC, created_at DESC`
    );

    const pending = result.rows.filter(item => !item.is_purchased);
    const purchased = result.rows.filter(item => item.is_purchased);

    return {
      items: result.rows,
      pending: pending,
      purchased: purchased,
      message: `${pending.length} items to buy, ${purchased.length} purchased`
    };
  } catch (error) {
    console.error('❌ [Context] Shopping fetch error:', error.message);
    return { items: [], error: error.message };
  }
};

/**
 * Fetch wishlist data
 */
const getWishlistContext = async () => {
  try {
    const result = await pool.query(
      `SELECT * FROM wishlist ORDER BY created_at DESC`
    );

    return { items: result.rows, message: `Found ${result.rows.length} wishlist items` };
  } catch (error) {
    console.error('❌ [Context] Wishlist fetch error:', error.message);
    return { items: [], error: error.message };
  }
};

/**
 * Fetch books context
 */
const getBooksContext = async () => {
  try {
    const books = await booksModel.getAllBooks();
    const current = books.filter(b => b.status === 'reading');
    const completed = books.filter(b => b.status === 'completed');

    return {
      books,
      current,
      completed,
      message: `Found ${books.length} books. Reading: ${current.map(b => `${b.book_name} (Page ${b.current_page}/${b.total_pages})`).join(', ') || 'None'}. Completed: ${completed.length}.`
    };
  } catch (error) {
    console.error('❌ [Context] Books fetch error:', error.message);
    return { books: [], error: error.message };
  }
};

/**
 * Fetch anime context
 */
const getAnimeContext = async () => {
  try {
    const anime = await animeModel.getAllAnime();
    const watching = anime.filter(a => !a.is_completed);
    const completed = anime.filter(a => a.is_completed);

    return {
      anime,
      watching,
      completed,
      message: `Found ${anime.length} anime. Watching: ${watching.map(a => `${a.anime_name} (Ep ${a.episodes_watched}/${a.total_episodes})`).join(', ') || 'None'}. Using Completed: ${completed.length}.`
    };
  } catch (error) {
    console.error('❌ [Context] Anime fetch error:', error.message);
    return { anime: [], error: error.message };
  }
};

/**
 * Get general analytics/overview - COMPREHENSIVE
 */
const getGeneralContext = async () => {
  try {
    // Get all relevant data for a complete overview
    const [stepsData, workoutsData, measurementsData, dietData] = await Promise.all([
      pool.query(`SELECT * FROM steps ORDER BY date DESC LIMIT 7`),
      pool.query(`SELECT * FROM workouts ORDER BY date DESC LIMIT 10`),
      pool.query(`SELECT * FROM body_measurements ORDER BY recorded_at DESC LIMIT 5`),
      pool.query(`SELECT * FROM diet_logs ORDER BY week DESC, day DESC LIMIT 10`)
    ]);

    // Calculate totals
    const stepsTotal = await pool.query(`SELECT SUM(steps) as total, AVG(steps) as avg FROM steps`);
    const workoutsTotal = await pool.query(`SELECT COUNT(*) as total FROM workouts`);

    const latestMeasurement = measurementsData.rows[0];
    let bmi = null;
    if (latestMeasurement?.weight && latestMeasurement?.height) {
      const heightM = parseFloat(latestMeasurement.height) / 100;
      bmi = (parseFloat(latestMeasurement.weight) / (heightM * heightM)).toFixed(1);
    }

    return {
      overview: {
        totalSteps: stepsTotal.rows[0]?.total || 0,
        avgSteps: Math.round(stepsTotal.rows[0]?.avg || 0),
        totalWorkouts: workoutsTotal.rows[0]?.total || 0,
        currentWeight: latestMeasurement?.weight || null,
        currentHeight: latestMeasurement?.height || null,
        bmi: bmi
      },
      recentSteps: stepsData.rows,
      recentWorkouts: workoutsData.rows,
      measurements: measurementsData.rows,
      recentMeals: dietData.rows,
      latestMeasurement: latestMeasurement,
      booksSummary: await getBooksContext(),
      animeSummary: await getAnimeContext(),
      message: `Overview: ${stepsTotal.rows[0]?.total || 0} total steps, ${workoutsTotal.rows[0]?.total || 0} workouts. Current Weight: ${latestMeasurement?.weight || 'N/A'}kg`
    };
  } catch (error) {
    console.error('❌ [Context] General fetch error:', error.message);
    return { overview: {}, error: error.message };
  }
};

// ================== TODAY'S SPECIFIC QUERIES ==================

/**
 * Get today's workouts - filter by current day name
 */
const getTodaysWorkouts = async () => {
  try {
    const todayDayName = getCurrentDayName();
    console.log('📅 [Context] Fetching workouts for:', todayDayName);

    const result = await pool.query(
      `SELECT * FROM workouts WHERE LOWER(day) = LOWER($1) ORDER BY id`,
      [todayDayName]
    );

    return {
      workouts: result.rows,
      dayName: todayDayName,
      count: result.rows.length,
      isToday: true,
      message: result.rows.length > 0
        ? `Found ${result.rows.length} workouts for ${todayDayName}`
        : `No workouts scheduled for ${todayDayName}`
    };
  } catch (error) {
    console.error('❌ [Context] Today\'s workouts fetch error:', error.message);
    return { workouts: [], dayName: getCurrentDayName(), count: 0, error: error.message };
  }
};

/**
 * Get today's meals - all 4 meal types (Breakfast, Lunch, Snack, Dinner)
 */
const getTodaysMeals = async () => {
  try {
    const todayDayName = getCurrentDayName();
    console.log('📅 [Context] Fetching meals for:', todayDayName);

    // Get food recipes for today's day
    const result = await pool.query(
      `SELECT * FROM food_recipes WHERE LOWER(day) = LOWER($1) ORDER BY 
        CASE meal_type 
          WHEN 'Breakfast' THEN 1 
          WHEN 'Lunch' THEN 2 
          WHEN 'Snack' THEN 3 
          WHEN 'Dinner' THEN 4 
          ELSE 5 
        END`,
      [todayDayName]
    );

    // Group meals by type
    const mealsByType = {
      Breakfast: null,
      Lunch: null,
      Snack: null,
      Dinner: null
    };

    result.rows.forEach(meal => {
      if (meal.meal_type && mealsByType.hasOwnProperty(meal.meal_type)) {
        mealsByType[meal.meal_type] = meal;
      }
    });

    // Calculate total calories
    const totalCalories = result.rows.reduce((sum, meal) => sum + (parseFloat(meal.calories) || 0), 0);

    return {
      meals: result.rows,
      mealsByType: mealsByType,
      dayName: todayDayName,
      totalCalories: Math.round(totalCalories),
      count: result.rows.length,
      isToday: true,
      message: result.rows.length > 0
        ? `Found ${result.rows.length} meals for ${todayDayName} (${Math.round(totalCalories)} cal total)`
        : `No meals planned for ${todayDayName}`
    };
  } catch (error) {
    console.error('❌ [Context] Today\'s meals fetch error:', error.message);
    return { meals: [], mealsByType: {}, dayName: getCurrentDayName(), totalCalories: 0, error: error.message };
  }
};

/**
 * Get today's analytics - calories eaten, burnt, steps, macros
 */
const getTodaysAnalytics = async () => {
  try {
    const todayDayName = getCurrentDayName();
    const todayDate = getTodayDate();
    console.log('📊 [Context] Fetching analytics for:', todayDayName, todayDate);

    // Get today's steps (by exact date)
    const stepsResult = await pool.query(
      `SELECT * FROM steps WHERE date = $1`,
      [todayDate]
    );
    const todaySteps = stepsResult.rows[0]?.steps || 0;

    // Get today's meals from diet_logs (actually eaten today)
    const dietLogsResult = await pool.query(
      `SELECT dl.*, fr.approx_calories, fr.protein, fr.carbs, fr.fats 
       FROM diet_logs dl
       LEFT JOIN food_recipes fr ON dl.recipe_id = fr.id
       WHERE dl.created_at::date = $1::date`,
      [todayDate]
    );

    // Calculate calories consumed from diet logs
    const caloriesConsumed = dietLogsResult.rows.reduce((sum, meal) => {
      return sum + (parseFloat(meal.approx_calories) || parseFloat(meal.calories) || 0);
    }, 0);

    // Calculate macros from diet logs
    const macros = {
      protein: dietLogsResult.rows.reduce((sum, meal) => sum + (parseFloat(meal.protein) || 0), 0),
      carbs: dietLogsResult.rows.reduce((sum, meal) => sum + (parseFloat(meal.carbs) || 0), 0),
      fats: dietLogsResult.rows.reduce((sum, meal) => sum + (parseFloat(meal.fats) || 0), 0)
    };

    // Get today's workouts (by exact date)
    const workoutsResult = await pool.query(
      `SELECT * FROM workouts WHERE date = $1`,
      [todayDate]
    );

    console.log('🏋️ [Context] Today\'s workouts found:', workoutsResult.rows.length, 'for date:', todayDate);

    // Estimate calories burnt from workouts (rough calculation: each exercise ~50-100 cal based on sets/reps)
    const workoutCaloriesBurnt = workoutsResult.rows.reduce((sum, workout) => {
      const sets = parseInt(workout.sets) || 1;
      const reps = parseInt(workout.reps) || 10;
      const weight = parseInt(workout.weights) || 0;
      // More accurate estimate: base calories + weight factor
      const baseCalories = sets * reps * 0.5;
      const weightBonus = weight > 0 ? (weight * 0.1 * sets) : 0;
      return sum + baseCalories + weightBonus;
    }, 0);

    // Also add steps calories (roughly 0.04 cal per step)
    const stepsCaloriesBurnt = Math.round(todaySteps * 0.04);
    const totalCaloriesBurnt = Math.round(workoutCaloriesBurnt + stepsCaloriesBurnt);

    console.log('🔥 [Context] Calories burnt breakdown - Workouts:', Math.round(workoutCaloriesBurnt), 'Steps:', stepsCaloriesBurnt, 'Total:', totalCaloriesBurnt);

    return {
      dayName: todayDayName,
      date: todayDate,
      steps: todaySteps,
      caloriesConsumed: Math.round(caloriesConsumed),
      caloriesPlanned: Math.round(caloriesConsumed), // For backwards compatibility
      caloriesBurnt: totalCaloriesBurnt,
      stepsCalories: stepsCaloriesBurnt,
      workoutCalories: Math.round(workoutCaloriesBurnt),
      macros: {
        protein: Math.round(macros.protein),
        carbs: Math.round(macros.carbs),
        fats: Math.round(macros.fats)
      },
      workoutsCount: workoutsResult.rows.length,
      mealsCount: dietLogsResult.rows.length,
      workouts: workoutsResult.rows,
      isToday: true,
      message: `Today's Analytics (${todayDate}): ${todaySteps} steps, ${Math.round(caloriesConsumed)} cal consumed, ${totalCaloriesBurnt} cal burnt (${Math.round(workoutCaloriesBurnt)} from ${workoutsResult.rows.length} workout(s) + ${stepsCaloriesBurnt} from steps)`
    };
  } catch (error) {
    console.error('❌ [Context] Today\'s analytics fetch error:', error.message);
    return {
      dayName: getCurrentDayName(),
      steps: 0,
      caloriesConsumed: 0,
      caloriesPlanned: 0,
      caloriesBurnt: 0,
      macros: { protein: 0, carbs: 0, fats: 0 },
      error: error.message
    };
  }
};

/**
 * Get today's reminders - filter by today's date
 */
const getTodaysReminders = async () => {
  try {
    const todayDate = getTodayDate();
    console.log('📅 [Context] Fetching reminders for:', todayDate);

    const result = await pool.query(
      `SELECT * FROM reminders WHERE date = $1 ORDER BY reminder_time ASC`,
      [todayDate]
    );

    return {
      reminders: result.rows,
      date: todayDate,
      count: result.rows.length,
      isToday: true,
      message: result.rows.length > 0
        ? `Found ${result.rows.length} reminders for today`
        : `No reminders for today`
    };
  } catch (error) {
    console.error('❌ [Context] Today\'s reminders fetch error:', error.message);
    return { reminders: [], date: getTodayDate(), count: 0, error: error.message };
  }
};

// ================== END TODAY'S SPECIFIC QUERIES ==================

/**
 * Main function to build context based on classification
 * @param {Object} classification - Intent classification result
 * @returns {Promise<Object>} Database context
 */
export const buildContext = async (classification) => {
  const { intent, entity, details } = classification;
  const timeRef = details?.time_reference;
  const originalQuery = details?.original_query || '';
  const lowerQuery = originalQuery.toLowerCase();

  console.log('📦 [Context] Building for:', entity, '| Time:', timeRef, '| Query:', originalQuery);

  // Check if this is a "today's" specific query
  const isTodayQuery = lowerQuery.includes("today's") ||
    lowerQuery.includes('todays') ||
    lowerQuery.includes('today') ||
    timeRef === 'today';

  let context = {};

  // Handle "today's" specific queries first
  if (isTodayQuery) {
    if (entity === 'workout' || lowerQuery.includes('workout')) {
      console.log('🎯 [Context] Today\'s workouts query detected');
      context = await getTodaysWorkouts();
      return context;
    }
    if (entity === 'diet' || lowerQuery.includes('meal') || lowerQuery.includes('food')) {
      console.log('🎯 [Context] Today\'s meals query detected');
      context = await getTodaysMeals();
      return context;
    }
    if (entity === 'analytics' || lowerQuery.includes('analytic') || lowerQuery.includes('calorie') || lowerQuery.includes('macro') || lowerQuery.includes('burnt')) {
      console.log('🎯 [Context] Today\'s analytics query detected');
      context = await getTodaysAnalytics();
      return context;
    }
    if (entity === 'reminder' || lowerQuery.includes('reminder')) {
      console.log('🎯 [Context] Today\'s reminders query detected');
      context = await getTodaysReminders();
      return context;
    }
  }

  switch (entity) {
    case 'workout':
      context = await getWorkoutContext(timeRef);
      break;
    case 'diet':
      context = await getDietContext(timeRef);
      break;
    case 'recipe':
      const searchTerm = details?.extracted_values?.name || null;
      context = await getRecipeContext(searchTerm);
      break;
    case 'reminder':
      context = await getReminderContext();
      break;
    case 'book':
      context = await getBooksContext();
      break;
    case 'anime':
      context = await getAnimeContext();
      break;
    case 'steps':
      context = await getStepsContext(timeRef);
      break;
    case 'measurement':
      context = await getMeasurementContext();
      break;
    case 'shopping':
      context = await getShoppingContext();
      break;
    case 'wishlist':
      context = await getWishlistContext();
      break;
    case 'analytics':
      // New analytics entity
      context = await getTodaysAnalytics();
      break;
    case 'general':
    default:
      context = await getGeneralContext();
      // For general queries, might need multiple contexts
      if (intent === 'query') {
        const [steps, workouts, measurements] = await Promise.all([
          getStepsContext('this week'),
          getWorkoutContext('this week'),
          getMeasurementContext(5)
        ]);
        context.weeklySteps = steps;
        context.weeklyWorkouts = workouts;
        context.recentMeasurements = measurements;
      }
      break;
  }

  console.log('✅ [Context] Built successfully for:', entity);
  return context;
};

export default {
  buildContext,
  getWorkoutContext,
  getDietContext,
  getRecipeContext,
  getReminderContext,
  getStepsContext,
  getMeasurementContext,
  getShoppingContext,
  getWishlistContext,
  getGeneralContext,
  getTodaysWorkouts,
  getTodaysMeals,
  getTodaysAnalytics,

  getTodaysReminders,
  getBooksContext,
  getAnimeContext,
};
