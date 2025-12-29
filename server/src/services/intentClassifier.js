import { Ollama } from 'ollama';
import { findBestMatch, initializeEmbeddings, isReady } from './embeddingService.js';

const ollama = new Ollama({ host: 'http://localhost:11434' });

// Initialize embeddings on module load
initializeEmbeddings().catch(err => {
  console.log('⚠️ [Intent] Embedding initialization deferred:', err.message);
});

// Intent types
export const INTENTS = {
  QUERY: 'query',           // User wants information
  ADD: 'add',               // User wants to add/create something
  UPDATE: 'update',         // User wants to modify something
  DELETE: 'delete',         // User wants to remove something
  CHAT: 'chat',             // General conversation
};

// Entity types (database tables)
export const ENTITIES = {
  WORKOUT: 'workout',
  DIET: 'diet',
  RECIPE: 'recipe',
  REMINDER: 'reminder',
  STEPS: 'steps',
  MEASUREMENT: 'measurement',
  SHOPPING: 'shopping',
  WISHLIST: 'wishlist',
  ANALYTICS: 'analytics',   // For today's analytics (calories, macros, etc.)
  GENERAL: 'general',       // For general stats, overviews
  BOOK: 'book',
  ANIME: 'anime',
};

// System prompt for intent classification
const CLASSIFICATION_PROMPT = `You are an intent classifier for a fitness and health tracking app called ISHA.
Your job is to analyze user messages and extract:
1. The intent (what action the user wants)
2. The entity (what data type they're referring to)
3. Any specific details mentioned

INTENTS:
- query: User wants to know/see/check information (e.g., "What did I eat today?", "Show my workouts", "Today's analytics")
- add: User wants to add/create/log something (e.g., "Add 5000 steps", "Log my breakfast", "Remind me to...", "Add milk to shopping list")
- update: User wants to modify/change/edit something (e.g., "Change my weight to 70kg")
- delete: User wants to remove/delete something (e.g., "Delete today's workout")
- chat: General conversation, greetings, questions about the app

ENTITIES:
- workout: Exercise, gym, training, fitness activities, push-ups, squats, bench press, running
- diet: Food logs, meals eaten, calories consumed, breakfast, lunch, dinner
- recipe: Food recipes, meal plans, cooking instructions
- reminder: Alerts, notifications, scheduled reminders, "remind me", "set a reminder"
- steps: Step count, walking, distance
- measurement: Body measurements, weight, height, BMI
- shopping: Shopping list, groceries to buy, "add to shopping list", "buy"
- wishlist: Items user wants to buy/get, "add to wishlist", "I want to buy"
- general: Analytics, progress, summaries, or unclear
- book: Reading list, books, "reading", "pages", "chapter"
- anime: Anime watchlist, "watching", "episodes", "season"

IMPORTANT: Extract all relevant values from the message!
- For workouts: workout_name (REQUIRED), sets, reps, weights, day, date
- For reminders: reminder_name (REQUIRED), reminder_time (HH:MM format), date
- For shopping: item_name (REQUIRED), quantity
- For wishlist: item_name (REQUIRED), price, description
- For diet: food_name (REQUIRED), meal_type, calories
- For steps: steps (REQUIRED - number), date
- For recipes: food_name (REQUIRED), week (1-5), day ("Day 1" to "Day 7"), meal_type (Breakfast/Lunch/Snack/Dinner), ingredients, calories
- For measurements: name (REQUIRED - e.g. 'weight', 'height'), value (REQUIRED for add/update - number)
- For books: book_name, author, current_page, total_pages
- For anime: anime_name, episode, total_episodes

RECIPE RULES:
- "add corn peas masala on week 1 day 2 for dinner" → intent: add, entity: recipe, food_name: "corn peas masala", week: 1, day: "Day 2", meal_type: "Dinner"
- "add oatmeal to recipes for breakfast" → intent: add, entity: recipe, food_name: "oatmeal", meal_type: "Breakfast"
- Keywords that indicate recipe: "recipe", "recipes", "meal plan", "week X day Y", "for breakfast/lunch/dinner"

MEASUREMENT RULES:
- "add my neck 15" or "my neck is 15" → intent: add, entity: measurement, name: neck, value: 15
- "clear neck" or "delete neck" or "remove neck" → intent: delete, entity: measurement, name: neck
- "change neck to 22" or "update neck to 22" or "set neck to 22" → intent: update, entity: measurement, name: neck, value: 22
- Handle variations: left bicep, leftbicep, left_bicep all map to left_bicep
- IMPORTANT: Always extract 'name' (body part name) and 'value' (number) for add/update intents

Respond ONLY with valid JSON in this exact format:
{
  "intent": "query|add|update|delete|chat",
  "entity": "workout|diet|recipe|reminder|steps|measurement|shopping|wishlist|general",
  "details": {
    "extracted_values": {},
    "time_reference": null,
    "original_query": ""
  },
  "confidence": 0.0
}

Examples:
User: "What workouts did I do this week?"
{"intent": "query", "entity": "workout", "details": {"extracted_values": {}, "time_reference": "this week", "original_query": "What workouts did I do this week?"}, "confidence": 0.95}

User: "Add 6000 steps for today"
{"intent": "add", "entity": "steps", "details": {"extracted_values": {"steps": 6000, "date": "today"}, "time_reference": "today", "original_query": "Add 6000 steps for today"}, "confidence": 0.98}

User: "I did 3 sets of 12 bench press at 60kg"
{"intent": "add", "entity": "workout", "details": {"extracted_values": {"workout_name": "bench press", "sets": 3, "reps": 12, "weights": 60}, "time_reference": "today", "original_query": "I did 3 sets of 12 bench press at 60kg"}, "confidence": 0.95}

User: "Remind me to drink water at 3pm"
{"intent": "add", "entity": "reminder", "details": {"extracted_values": {"reminder_name": "drink water", "reminder_time": "15:00"}, "time_reference": "today", "original_query": "Remind me to drink water at 3pm"}, "confidence": 0.96}

User: "Set a reminder to buy shoes on 25th December"
{"intent": "add", "entity": "reminder", "details": {"extracted_values": {"reminder_name": "buy shoes", "date": "2024-12-25"}, "time_reference": "25th December", "original_query": "Set a reminder to buy shoes on 25th December"}, "confidence": 0.96}

User: "Remind me to buy plants on 29th December 11 AM"
{"intent": "add", "entity": "reminder", "details": {"extracted_values": {"reminder_name": "buy plants", "date": "2024-12-29", "reminder_time": "11:00"}, "time_reference": "29th December 11 AM", "original_query": "Remind me to buy plants on 29th December 11 AM"}, "confidence": 0.97}

User: "Set reminder for gym tomorrow at 6am"
{"intent": "add", "entity": "reminder", "details": {"extracted_values": {"reminder_name": "gym", "date": "tomorrow", "reminder_time": "06:00"}, "time_reference": "tomorrow", "original_query": "Set reminder for gym tomorrow at 6am"}, "confidence": 0.96}

User: "Change my reminder for gym to 7pm" or "Update gym reminder time to 7pm"
{"intent": "update", "entity": "reminder", "details": {"extracted_values": {"reminder_name": "gym", "reminder_time": "19:00"}, "time_reference": null, "original_query": "Change my reminder for gym to 7pm"}, "confidence": 0.95}

User: "Move buy shoes reminder to 26th December"
{"intent": "update", "entity": "reminder", "details": {"extracted_values": {"reminder_name": "buy shoes", "date": "2024-12-26"}, "time_reference": "26th December", "original_query": "Move buy shoes reminder to 26th December"}, "confidence": 0.95}

User: "Delete my gym reminder" or "Remove the water reminder"
{"intent": "delete", "entity": "reminder", "details": {"extracted_values": {"reminder_name": "gym"}, "time_reference": null, "original_query": "Delete my gym reminder"}, "confidence": 0.96}

User: "Turn off gym reminder" or "Disable water reminder"
{"intent": "update", "entity": "reminder", "details": {"extracted_values": {"reminder_name": "gym", "enabled": false}, "time_reference": null, "original_query": "Turn off gym reminder"}, "confidence": 0.94}

User: "Turn on gym reminder" or "Enable water reminder"
{"intent": "update", "entity": "reminder", "details": {"extracted_values": {"reminder_name": "gym", "enabled": true}, "time_reference": null, "original_query": "Turn on gym reminder"}, "confidence": 0.94}

User: "Add milk and eggs to my shopping list"
{"intent": "add", "entity": "shopping", "details": {"extracted_values": {"items": ["milk", "eggs"]}, "time_reference": null, "original_query": "Add milk and eggs to my shopping list"}, "confidence": 0.97}

User: "Add bread to shopping list"
{"intent": "add", "entity": "shopping", "details": {"extracted_values": {"item_name": "bread"}, "time_reference": null, "original_query": "Add bread to shopping list"}, "confidence": 0.96}

User: "Remove milk from shopping list" or "Delete eggs from shopping"
{"intent": "delete", "entity": "shopping", "details": {"extracted_values": {"item_name": "milk"}, "time_reference": null, "original_query": "Remove milk from shopping list"}, "confidence": 0.95}

User: "Change milk to almond milk in shopping list" or "Update milk to soy milk"
{"intent": "update", "entity": "shopping", "details": {"extracted_values": {"old_name": "milk", "new_name": "almond milk"}, "time_reference": null, "original_query": "Change milk to almond milk in shopping list"}, "confidence": 0.94}

User: "Update bread quantity to 2 in shopping list"
{"intent": "update", "entity": "shopping", "details": {"extracted_values": {"item_name": "bread", "quantity": 2}, "time_reference": null, "original_query": "Update bread quantity to 2 in shopping list"}, "confidence": 0.93}

User: "I want to buy new running shoes for $120"
{"intent": "add", "entity": "wishlist", "details": {"extracted_values": {"item_name": "running shoes", "price": 120}, "time_reference": null, "original_query": "I want to buy new running shoes for $120"}, "confidence": 0.94}

User: "Add iPhone to my wishlist" or "Add laptop to wishlist for 50000"
{"intent": "add", "entity": "wishlist", "details": {"extracted_values": {"item_name": "iPhone"}, "time_reference": null, "original_query": "Add iPhone to my wishlist"}, "confidence": 0.95}

User: "Remove running shoes from wishlist" or "Delete iPhone from wishlist"
{"intent": "delete", "entity": "wishlist", "details": {"extracted_values": {"item_name": "running shoes"}, "time_reference": null, "original_query": "Remove running shoes from wishlist"}, "confidence": 0.95}

User: "Change running shoes price to 5000 in wishlist" or "Update iPhone price to 80000"
{"intent": "update", "entity": "wishlist", "details": {"extracted_values": {"item_name": "running shoes", "price": 5000}, "time_reference": null, "original_query": "Change running shoes price to 5000 in wishlist"}, "confidence": 0.94}

User: "Set laptop priority to high in wishlist"
{"intent": "update", "entity": "wishlist", "details": {"extracted_values": {"item_name": "laptop", "priority": "high"}, "time_reference": null, "original_query": "Set laptop priority to high in wishlist"}, "confidence": 0.93}

User: "Change iPhone to iPhone 15 in wishlist"
{"intent": "update", "entity": "wishlist", "details": {"extracted_values": {"old_name": "iPhone", "new_name": "iPhone 15"}, "time_reference": null, "original_query": "Change iPhone to iPhone 15 in wishlist"}, "confidence": 0.94}

User: "I weigh 72 kilos now"
{"intent": "update", "entity": "measurement", "details": {"extracted_values": {"name": "weight", "value": 72}, "time_reference": "now", "original_query": "I weigh 72 kilos now"}, "confidence": 0.90}

User: "Update my chest measurement to 40 inches"
{"intent": "update", "entity": "measurement", "details": {"extracted_values": {"name": "chest", "value": 40}, "time_reference": null, "original_query": "Update my chest measurement to 40 inches"}, "confidence": 0.92}

User: "Add my neck 15"
{"intent": "add", "entity": "measurement", "details": {"extracted_values": {"name": "neck", "value": 15}, "time_reference": null, "original_query": "Add my neck 15"}, "confidence": 0.95}

User: "My left bicep is 14 inches"
{"intent": "add", "entity": "measurement", "details": {"extracted_values": {"name": "left_bicep", "value": 14}, "time_reference": null, "original_query": "My left bicep is 14 inches"}, "confidence": 0.94}

User: "Clear neck" or "Delete my neck measurement"
{"intent": "delete", "entity": "measurement", "details": {"extracted_values": {"name": "neck"}, "time_reference": null, "original_query": "Clear neck"}, "confidence": 0.96}

User: "Change my shoulder to 48"
{"intent": "update", "entity": "measurement", "details": {"extracted_values": {"name": "shoulder", "value": 48}, "time_reference": null, "original_query": "Change my shoulder to 48"}, "confidence": 0.95}

User: "Set neck to 22"
{"intent": "update", "entity": "measurement", "details": {"extracted_values": {"name": "neck", "value": 22}, "time_reference": null, "original_query": "Set neck to 22"}, "confidence": 0.96}

User: "Add a recipe for protein shake with banana and whey protein"
{"intent": "add", "entity": "recipe", "details": {"extracted_values": {"food_name": "protein shake", "ingredients": ["banana", "whey protein"]}, "time_reference": null, "original_query": "Add a recipe for protein shake with banana and whey protein"}, "confidence": 0.94}

User: "Add corn peas masala on week 1 day 2 for dinner"
{"intent": "add", "entity": "recipe", "details": {"extracted_values": {"food_name": "corn peas masala", "week": 1, "day": "Day 2", "meal_type": "Dinner"}, "time_reference": null, "original_query": "Add corn peas masala on week 1 day 2 for dinner"}, "confidence": 0.96}

User: "Add oatmeal to recipes for breakfast week 2 day 3"
{"intent": "add", "entity": "recipe", "details": {"extracted_values": {"food_name": "oatmeal", "week": 2, "day": "Day 3", "meal_type": "Breakfast"}, "time_reference": null, "original_query": "Add oatmeal to recipes for breakfast week 2 day 3"}, "confidence": 0.95}

User: "Add grilled chicken for lunch on week 1 day 5"
{"intent": "add", "entity": "recipe", "details": {"extracted_values": {"food_name": "grilled chicken", "week": 1, "day": "Day 5", "meal_type": "Lunch"}, "time_reference": null, "original_query": "Add grilled chicken for lunch on week 1 day 5"}, "confidence": 0.95}

User: "Add eggs to lunch week 1 day 1"
{"intent": "add", "entity": "recipe", "details": {"extracted_values": {"food_name": "eggs", "week": 1, "day": "Day 1", "meal_type": "Lunch"}, "time_reference": null, "original_query": "Add eggs to lunch week 1 day 1"}, "confidence": 0.96}

User: "Add pasta to dinner week 2 day 4"
{"intent": "add", "entity": "recipe", "details": {"extracted_values": {"food_name": "pasta", "week": 2, "day": "Day 4", "meal_type": "Dinner"}, "time_reference": null, "original_query": "Add pasta to dinner week 2 day 4"}, "confidence": 0.95}

User: "Delete the chicken salad recipe"
{"intent": "delete", "entity": "recipe", "details": {"extracted_values": {"food_name": "chicken salad"}, "time_reference": null, "original_query": "Delete the chicken salad recipe"}, "confidence": 0.93}

User: "Delete skipping from workout" or "Remove skipping from my workouts"
{"intent": "delete", "entity": "workout", "details": {"extracted_values": {"workout_name": "skipping"}, "time_reference": null, "original_query": "Delete skipping from workout"}, "confidence": 0.95}

User: "Remove bench press" or "Delete my squats workout"
{"intent": "delete", "entity": "workout", "details": {"extracted_values": {"workout_name": "bench press"}, "time_reference": null, "original_query": "Remove bench press"}, "confidence": 0.94}

User: "I had breakfast today" or "I ate breakfast"
{"intent": "add", "entity": "diet", "details": {"extracted_values": {"meal_type": "Breakfast", "action": "mark_eaten"}, "time_reference": "today", "original_query": "I had breakfast today"}, "confidence": 0.96}

User: "I had lunch and dinner" or "Had lunch, dinner today"
{"intent": "add", "entity": "diet", "details": {"extracted_values": {"meal_types": ["Lunch", "Dinner"], "action": "mark_eaten"}, "time_reference": "today", "original_query": "I had lunch and dinner"}, "confidence": 0.96}

User: "I ate my breakfast, lunch, snack and dinner"
{"intent": "add", "entity": "diet", "details": {"extracted_values": {"meal_types": ["Breakfast", "Lunch", "Snack", "Dinner"], "action": "mark_eaten"}, "time_reference": "today", "original_query": "I ate my breakfast, lunch, snack and dinner"}, "confidence": 0.97}

User: "Had snack" or "I ate snack today"
{"intent": "add", "entity": "diet", "details": {"extracted_values": {"meal_type": "Snack", "action": "mark_eaten"}, "time_reference": "today", "original_query": "Had snack"}, "confidence": 0.95}

User: "I didn't have breakfast" or "Skip breakfast" or "Didn't eat lunch"
{"intent": "delete", "entity": "diet", "details": {"extracted_values": {"meal_type": "Breakfast", "action": "unmark_eaten"}, "time_reference": "today", "original_query": "I didn't have breakfast"}, "confidence": 0.94}

User: "How many calories did I burn?" or "Calories burnt today"
{"intent": "query", "entity": "analytics", "details": {"extracted_values": {"metric": "calories_burnt"}, "time_reference": "today", "original_query": "How many calories did I burn?"}, "confidence": 0.96}

User: "How many calories did I consume?" or "Calories eaten today"
{"intent": "query", "entity": "diet", "details": {"extracted_values": {"metric": "calories_consumed"}, "time_reference": "today", "original_query": "How many calories did I consume?"}, "confidence": 0.95}

User: "Show my progress" or "What are my stats?"
{"intent": "query", "entity": "analytics", "details": {"extracted_values": {}, "time_reference": null, "original_query": "Show my progress"}, "confidence": 0.94}

User: "Hey, how are you?"
{"intent": "chat", "entity": "general", "details": {"extracted_values": {}, "time_reference": null, "original_query": "Hey, how are you?"}, "confidence": 0.99}`;

/**
 * Extract values using LLM for semantic matches that need details
 */
const extractValuesWithLLM = async (message, intent, entity) => {
  const prompt = `Extract values from this message for a ${intent} action on ${entity}.
Message: "${message}"

Return ONLY a JSON object with extracted values. Examples of fields:
- workout: workout_name, sets, reps, weights, day, date
- diet: meal_type, food_name, calories, action (mark_eaten/unmark_eaten)
- recipe: food_name, week, day, meal_type, ingredients
- steps: steps (number), date
- measurement: name (body part), value (number)
- reminder: reminder_name, reminder_time (HH:MM), date
- shopping: item_name, items (array), quantity, price
- wishlist: item_name, price, category, priority

Return ONLY valid JSON, no explanation.`;

  const response = await ollama.chat({
    model: 'mistral',
    messages: [{ role: 'user', content: prompt }],
    format: 'json',
    options: { temperature: 0.1 }
  });

  return JSON.parse(response.message.content);
};

/**
 * Extract values using regex patterns (fast fallback)
 */
const extractValuesWithRegex = (message, entity) => {
  const lowerMessage = message.toLowerCase();
  const values = {};

  switch (entity) {
    case 'workout':
      // Extract workout name
      const workoutMatch = message.match(/(?:add|log|record|did)\s+(?:(\d+)\s+sets?\s+(?:of\s+)?(\d+)\s+(?:reps?\s+)?)?(.+?)(?:\s+(?:with|at|for|on|today|yesterday)|\s*$)/i);
      if (workoutMatch) {
        if (workoutMatch[1]) values.sets = parseInt(workoutMatch[1]);
        if (workoutMatch[2]) values.reps = parseInt(workoutMatch[2]);
        if (workoutMatch[3]) values.workout_name = workoutMatch[3].trim();
      }
      // Extract weight
      const weightMatch = message.match(/(\d+)\s*(?:kg|lbs?|pounds?)/i);
      if (weightMatch) values.weights = parseInt(weightMatch[1]);
      break;

    case 'steps':
      const stepsMatch = message.match(/(\d+)\s*steps?/i);
      if (stepsMatch) values.steps = parseInt(stepsMatch[1]);
      break;

    case 'reminder':
      // Extract time
      const timeMatch = message.match(/(?:at\s+)?(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        if (timeMatch[3]?.toLowerCase() === 'pm' && hours < 12) hours += 12;
        if (timeMatch[3]?.toLowerCase() === 'am' && hours === 12) hours = 0;
        values.reminder_time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      // Extract reminder name
      const reminderMatch = message.match(/(?:remind(?:er)?(?:\s+me)?(?:\s+to)?|set\s+(?:a\s+)?reminder(?:\s+to)?)\s+(.+?)(?:\s+(?:at|on|tomorrow|today|\d))/i);
      if (reminderMatch) values.reminder_name = reminderMatch[1].trim();
      break;

    case 'shopping':
      // Check for multiple items
      const itemsMatch = message.match(/add\s+(.+?)\s+(?:to\s+)?(?:shopping|grocery)/i);
      if (itemsMatch) {
        const itemsStr = itemsMatch[1];
        if (itemsStr.includes(',') || itemsStr.includes(' and ')) {
          values.items = itemsStr.split(/,|\s+and\s+/).map(i => i.trim()).filter(i => i);
        } else {
          values.item_name = itemsStr.trim();
        }
      }
      break;

    case 'wishlist':
      const wishMatch = message.match(/add\s+(.+?)\s+(?:to\s+)?wishlist/i);
      if (wishMatch) values.item_name = wishMatch[1].trim();
      const priceMatch = message.match(/(?:for|at|price)?\s*(?:₹|\$|rs\.?)?\s*(\d+)/i);
      if (priceMatch) values.price = parseInt(priceMatch[1]);
      break;

    case 'measurement':
      const measureMatch = message.match(/(?:set|update|change|my)\s+(.+?)\s+(?:to|is|=)\s+(\d+)/i);
      if (measureMatch) {
        values.name = measureMatch[1].trim().replace(/\s+/g, '_').toLowerCase();
        values.value = parseInt(measureMatch[2]);
      }
      break;

    case 'diet':
      // Check for meal types
      const mealTypes = [];
      if (/breakfast/i.test(lowerMessage)) mealTypes.push('Breakfast');
      if (/lunch/i.test(lowerMessage)) mealTypes.push('Lunch');
      if (/dinner/i.test(lowerMessage)) mealTypes.push('Dinner');
      if (/snack/i.test(lowerMessage)) mealTypes.push('Snack');

      if (mealTypes.length > 1) {
        values.meal_types = mealTypes;
        values.action = 'mark_eaten';
      } else if (mealTypes.length === 1) {
        values.meal_type = mealTypes[0];
        values.action = /didn't|didn't|skip|remove/i.test(lowerMessage) ? 'unmark_eaten' : 'mark_eaten';
      }
      break;

    case 'recipe':
      const recipeMatch = message.match(/add\s+(.+?)\s+(?:for|to)\s+(breakfast|lunch|dinner|snack)/i);
      if (recipeMatch) {
        values.food_name = recipeMatch[1].trim();
        values.meal_type = recipeMatch[2].charAt(0).toUpperCase() + recipeMatch[2].slice(1).toLowerCase();
      }
      const weekMatch = message.match(/week\s*(\d+)/i);
      const dayMatch = message.match(/day\s*(\d+)/i);
      if (weekMatch) values.week = parseInt(weekMatch[1]);
      if (dayMatch) values.day = `Day ${dayMatch[1]}`;
      break;
  }

  return values;
};

/**
 * Classify user message intent using Mistral via Ollama
 * @param {string} message - User's message
 * @returns {Promise<Object>} Classification result
 */
export const classifyIntent = async (message) => {
  try {
    console.log('🧠 [Intent] Classifying:', message);

    // STEP 1: Try semantic search first (fastest & most reliable for known patterns)
    if (isReady()) {
      const semanticMatch = await findBestMatch(message, 0.65);
      if (semanticMatch && semanticMatch.confidence >= 0.65) {
        console.log(`✅ [Intent] Semantic match: ${semanticMatch.intent} → ${semanticMatch.entity} (${(semanticMatch.confidence * 100).toFixed(1)}%)`);

        // Still need to extract values using LLM for ADD/UPDATE/DELETE intents
        if (['add', 'update', 'delete'].includes(semanticMatch.intent)) {
          try {
            const extractedValues = await extractValuesWithLLM(message, semanticMatch.intent, semanticMatch.entity);
            return {
              intent: semanticMatch.intent,
              entity: semanticMatch.entity,
              details: {
                extracted_values: extractedValues,
                time_reference: extractedValues.date || extractedValues.time_reference || null,
                original_query: message
              },
              confidence: semanticMatch.confidence,
              method: 'semantic+llm'
            };
          } catch (extractError) {
            console.log('⚠️ [Intent] Value extraction failed, using regex fallback');
            const extractedValues = extractValuesWithRegex(message, semanticMatch.entity);
            return {
              intent: semanticMatch.intent,
              entity: semanticMatch.entity,
              details: {
                extracted_values: extractedValues,
                time_reference: null,
                original_query: message
              },
              confidence: semanticMatch.confidence,
              method: 'semantic+regex'
            };
          }
        }

        // For QUERY and CHAT, no value extraction needed
        return {
          intent: semanticMatch.intent,
          entity: semanticMatch.entity,
          details: {
            extracted_values: {},
            time_reference: null,
            original_query: message
          },
          confidence: semanticMatch.confidence,
          method: 'semantic'
        };
      }
    }

    // STEP 2: Fall back to LLM classification
    console.log('🔄 [Intent] Semantic match not confident enough, trying LLM...');
    const response = await ollama.chat({
      model: 'mistral',
      messages: [
        { role: 'system', content: CLASSIFICATION_PROMPT },
        { role: 'user', content: message }
      ],
      format: 'json',
      options: {
        temperature: 0.1,  // Low temperature for consistent classification
      }
    });

    const content = response.message.content;
    console.log('🧠 [Intent] LLM response:', content);

    // Parse JSON response
    const classification = JSON.parse(content);

    // Validate the classification - if structure is wrong, use fallback
    const hasValidIntent = classification.intent && INTENTS[classification.intent.toUpperCase()];
    const hasValidEntity = classification.entity && Object.values(ENTITIES).includes(classification.entity);

    // If the LLM returned garbage JSON without proper intent/entity, use fallback
    if (!hasValidIntent || !hasValidEntity) {
      console.log('⚠️ [Intent] Invalid LLM response structure, using regex fallback');
      return fallbackClassification(message);
    }

    classification.method = 'llm';
    console.log('✅ [Intent] LLM classified:', classification.intent, '→', classification.entity);
    return classification;

  } catch (error) {
    console.error('❌ [Intent] Classification error:', error.message);

    // Fallback to simple regex-based classification
    return fallbackClassification(message);
  }
};

/**
 * Fallback classification using regex patterns when LLM fails
 * @param {string} message 
 * @returns {Object} Classification result
 */
const fallbackClassification = (message) => {
  const lowerMessage = message.toLowerCase();

  // Entity patterns - check FIRST to help determine intent
  let entity = ENTITIES.GENERAL;

  // Check for "calories burnt" FIRST - this should go to analytics, not diet
  if (/calorie.*(burn|burnt)|burn.*calorie|(how\s+many|what).*(burn|burnt)/i.test(lowerMessage)) {
    entity = ENTITIES.ANALYTICS;
  }
  // Check for "today's X" patterns 
  else if (/today'?s?\s+(workout|exercise)/i.test(lowerMessage)) {
    entity = ENTITIES.WORKOUT;
  } else if (/today'?s?\s+(meal|food|diet)/i.test(lowerMessage)) {
    entity = ENTITIES.DIET;
  } else if (/today'?s?\s+(analytic|calorie|macro|burnt|summary|stats)/i.test(lowerMessage)) {
    entity = ENTITIES.ANALYTICS;
  } else if (/today'?s?\s+reminder/i.test(lowerMessage)) {
    entity = ENTITIES.REMINDER;
  } else if (/week\s*\d+\s*day\s*\d+|recipe|recipes|(for|to)\s+(breakfast|lunch|dinner|snack)/i.test(lowerMessage)) {
    entity = ENTITIES.RECIPE;
  } else if (/remind|reminder|alert|notify/i.test(lowerMessage)) {
    entity = ENTITIES.REMINDER;
  } else if (/workout|exercise|gym|training|lift|push.?up|pull.?up|squat|bench|deadlift|curl/i.test(lowerMessage)) {
    entity = ENTITIES.WORKOUT;
  } else if (/analytic|stats|summary|progress|macro/i.test(lowerMessage)) {
    entity = ENTITIES.ANALYTICS;
  } else if (/diet|meal|food|eat|ate|calories\s*(consumed|eaten|intake)|breakfast|lunch|dinner|snack/i.test(lowerMessage)) {
    entity = ENTITIES.DIET;
  } else if (/step|walk|walking|distance/i.test(lowerMessage)) {
    entity = ENTITIES.STEPS;
  } else if (/weight|height|measure|bmi|body|neck|bicep|forearm|waist|chest|shoulder|calf|leg|stomach/i.test(lowerMessage)) {
    entity = ENTITIES.MEASUREMENT;
  } else if (/shop|grocery|shopping.?list/i.test(lowerMessage)) {
    entity = ENTITIES.SHOPPING;
  } else if (/wish|wishlist/i.test(lowerMessage)) {
    entity = ENTITIES.WISHLIST;
  } else if (/book|read|reading|page|chapter|author/i.test(lowerMessage)) {
    entity = ENTITIES.BOOK;
  } else if (/anime|manga|watch|episode|season/i.test(lowerMessage)) {
    entity = ENTITIES.ANIME;
  }

  // Intent patterns
  let intent = INTENTS.CHAT;

  // Check for "today's" queries - these are almost always QUERY intent
  if (/today'?s?\s+(workout|meal|food|diet|analytic|reminder|calorie|macro)/i.test(lowerMessage)) {
    intent = INTENTS.QUERY;
  } else if (entity === ENTITIES.REMINDER) {
    // Check for reminder intents specifically
    if (/set|add|create|remind\s*me|new\s*reminder/i.test(lowerMessage)) {
      intent = INTENTS.ADD;
    } else if (/update|change|modify|edit|move|reschedule/i.test(lowerMessage)) {
      intent = INTENTS.UPDATE;
    } else if (/delete|remove|cancel|clear/i.test(lowerMessage)) {
      intent = INTENTS.DELETE;
    } else if (/show|what|list|get|display/i.test(lowerMessage)) {
      intent = INTENTS.QUERY;
    } else {
      // Default to ADD for reminder mentions like "remind me to..."
      intent = INTENTS.ADD;
    }
  } else if (/^(show|what|how many|list|get|display|tell me|check)/i.test(lowerMessage)) {
    intent = INTENTS.QUERY;
  } else if (/^(add|log|record|create|i (did|ate|walked|ran|weigh))/i.test(lowerMessage)) {
    intent = INTENTS.ADD;
  } else if (/^(update|change|modify|edit|set)/i.test(lowerMessage)) {
    intent = INTENTS.UPDATE;
  } else if (/^(delete|remove|cancel|clear)/i.test(lowerMessage)) {
    intent = INTENTS.DELETE;
  }

  // Extract values for reminders
  const extractedValues = {};

  if (entity === ENTITIES.REMINDER) {
    // Extract reminder name - text after "remind me to", "reminder to", "set a reminder to", etc.
    const reminderMatch = lowerMessage.match(/(?:remind(?:er)?(?:\s+me)?(?:\s+to)?|set\s+(?:a\s+)?reminder(?:\s+to)?)\s+(.+?)(?:\s+(?:at|on|tomorrow|today|\d))/i);
    if (reminderMatch) {
      extractedValues.reminder_name = reminderMatch[1].trim();
    } else {
      // Fallback - try to extract reminder name differently
      const altMatch = lowerMessage.match(/(?:remind(?:er)?(?:\s+me)?(?:\s+to)?|set\s+(?:a\s+)?reminder(?:\s+to)?)\s+(.+)/i);
      if (altMatch) {
        // Remove time/date parts from the end
        let name = altMatch[1].trim();
        name = name.replace(/\s+(at\s+)?\d{1,2}(:\d{2})?\s*(am|pm)?$/i, '');
        name = name.replace(/\s+on\s+\d{1,2}(st|nd|rd|th)?\s+\w+$/i, '');
        name = name.replace(/\s+(today|tomorrow)$/i, '');
        extractedValues.reminder_name = name.trim();
      }
    }

    // Extract time - patterns like "3pm", "11am", "6:30 pm", "at 8 AM"
    const timeMatch = lowerMessage.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] || '00';
      const ampm = timeMatch[3].toLowerCase();
      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      extractedValues.reminder_time = `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    // Extract date - patterns like "27th December", "December 27"
    const months = {
      'january': 0, 'jan': 0, 'february': 1, 'feb': 1, 'march': 2, 'mar': 2,
      'april': 3, 'apr': 3, 'may': 4, 'june': 5, 'jun': 5, 'july': 6, 'jul': 6,
      'august': 7, 'aug': 7, 'september': 8, 'sep': 8, 'sept': 8, 'october': 9, 'oct': 9,
      'november': 10, 'nov': 10, 'december': 11, 'dec': 11
    };

    // Helper to format date as YYYY-MM-DD in local timezone
    const formatDateLocal = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    // Pattern: "27th December" or "27 December"
    const dateMatch1 = lowerMessage.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)/i);
    // Pattern: "December 27" or "December 27th"
    const dateMatch2 = lowerMessage.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?/i);

    if (dateMatch1) {
      const day = parseInt(dateMatch1[1]);
      const monthStr = dateMatch1[2].toLowerCase();
      const month = months[monthStr];
      if (month !== undefined) {
        const year = new Date().getFullYear();
        const targetDate = new Date(year, month, day);
        if (targetDate < new Date()) {
          targetDate.setFullYear(year + 1);
        }
        extractedValues.date = formatDateLocal(targetDate);
      }
    } else if (dateMatch2) {
      const monthStr = dateMatch2[1].toLowerCase();
      const day = parseInt(dateMatch2[2]);
      const month = months[monthStr];
      if (month !== undefined) {
        const year = new Date().getFullYear();
        const targetDate = new Date(year, month, day);
        if (targetDate < new Date()) {
          targetDate.setFullYear(year + 1);
        }
        extractedValues.date = formatDateLocal(targetDate);
      }
    } else if (/tomorrow/i.test(lowerMessage)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      extractedValues.date = formatDateLocal(tomorrow);
    } else if (/today/i.test(lowerMessage)) {
      extractedValues.date = formatDateLocal(new Date());
    }
  }

  // Extract numbers for other entities
  const numbers = lowerMessage.match(/\d+(\.\d+)?/g);
  if (numbers && numbers.length > 0 && entity !== ENTITIES.REMINDER) {
    if (entity === ENTITIES.STEPS) {
      extractedValues.steps = parseInt(numbers[0]);
    } else if (entity === ENTITIES.MEASUREMENT) {
      // Extract measurement name and value
      const measurementParts = ['weight', 'height', 'neck', 'chest', 'waist', 'stomach', 'shoulder',
        'left bicep', 'right bicep', 'left forearm', 'right forearm',
        'left leg', 'right leg', 'left calf', 'right calf', 'leftbicep', 'rightbicep'];
      for (const part of measurementParts) {
        if (lowerMessage.includes(part)) {
          extractedValues.name = part.replace(' ', '_');
          extractedValues.value = parseFloat(numbers[0]);
          break;
        }
      }
      // Fallback to weight if no specific part found
      if (!extractedValues.name) {
        extractedValues.weight = parseFloat(numbers[0]);
      }
    }
  }

  console.log('🔄 [Intent] Fallback classification:', intent, '→', entity, 'Values:', extractedValues);

  return {
    intent,
    entity,
    details: {
      extracted_values: extractedValues,
      time_reference: null,
      original_query: message
    },
    confidence: 0.6,
    fallback: true
  };
};

export default {
  classifyIntent,
  INTENTS,
  ENTITIES,
};
