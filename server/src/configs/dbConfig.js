import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Test database connection
export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();

    // Run migrations to add missing columns
    await runMigrations();
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    process.exit(1);
  }
};

// Run database migrations to add missing columns
const runMigrations = async () => {
  try {
    // 1. Create independent tables first

    // Create workouts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        workout_name VARCHAR(255) NOT NULL,
        sets INTEGER,
        reps INTEGER,
        weights DECIMAL(10, 2),
        day VARCHAR(20),
        date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create food_recipes table (Must be before diet_logs because of foreign key)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_recipes (
        id SERIAL PRIMARY KEY,
        week INTEGER,
        day VARCHAR(20),
        meal_type VARCHAR(20),
        food_name VARCHAR(255) NOT NULL,
        ingredients JSONB DEFAULT '[]',
        servings DECIMAL(10, 2) DEFAULT 1,
        recipe TEXT,
        approx_calories INTEGER,
        protein INTEGER DEFAULT 0,
        fat INTEGER DEFAULT 0,
        carbs INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create steps table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS steps (
        id SERIAL PRIMARY KEY,
        day VARCHAR(20),
        steps INTEGER DEFAULT 0,
        date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create reminders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        reminder_name VARCHAR(255) NOT NULL,
        reminder_time TIME,
        day VARCHAR(20),
        date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create shopping_list table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_list (
        id SERIAL PRIMARY KEY,
        grocery_name VARCHAR(255) NOT NULL,
        amount VARCHAR(100),
        price_rupees DECIMAL(10, 2) DEFAULT 0,
        day VARCHAR(20),
        date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create tables with dependencies

    // Create diet_logs table (Depends on food_recipes)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS diet_logs (
        id SERIAL PRIMARY KEY,
        food_name VARCHAR(255) NOT NULL,
        meal_type VARCHAR(20) NOT NULL,
        week INTEGER,
        day VARCHAR(20),
        calories INTEGER DEFAULT 0,
        recipe_id INTEGER REFERENCES food_recipes(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Add columns to existing tables (if needed)

    // Add approx_calories column if it doesn't exist
    await pool.query(`
      ALTER TABLE food_recipes 
      ADD COLUMN IF NOT EXISTS approx_calories INTEGER;
    `);

    // Add protein, fat, carbs columns if they don't exist
    await pool.query(`
      ALTER TABLE food_recipes ADD COLUMN IF NOT EXISTS protein INTEGER DEFAULT 0;
      ALTER TABLE food_recipes ADD COLUMN IF NOT EXISTS fat INTEGER DEFAULT 0;
      ALTER TABLE food_recipes ADD COLUMN IF NOT EXISTS carbs INTEGER DEFAULT 0;
    `);

    // Add meal_type column if it doesn't exist
    await pool.query(`
      ALTER TABLE food_recipes ADD COLUMN IF NOT EXISTS meal_type VARCHAR(20);
    `);

    // Add servings column if it doesn't exist
    await pool.query(`
      ALTER TABLE food_recipes ADD COLUMN IF NOT EXISTS servings DECIMAL(10, 2) DEFAULT 1;
    `);

    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('⚠️ Migration warning:', error.message);
  }
};



export default pool;
