import { Ollama } from 'ollama';
import { classifyIntent, INTENTS, ENTITIES } from '../services/intentClassifier.js';
import { buildContext } from '../services/databaseContext.js';
import { executeAction } from '../services/actionExecutor.js';
import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';
import wavDecoder from 'wav-decoder';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const ollama = new Ollama({ host: 'http://localhost:11434' });

// Whisper pipeline (lazy loaded)
let whisperPipeline = null;

const getWhisperPipeline = async () => {
  if (!whisperPipeline) {
    console.log('🔄 [Whisper] Loading speech recognition model... (first time may take a while)');
    whisperPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
    console.log('✅ [Whisper] Model loaded successfully!');
  }
  return whisperPipeline;
};

/**
 * Convert any audio file to WAV format using FFmpeg
 */
const convertToWav = (inputPath) => {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath.replace(/\.[^.]+$/, '_converted.wav');
    
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioFrequency(16000)
      .audioChannels(1)
      .audioCodec('pcm_s16le')
      .on('error', (err) => {
        console.error('❌ [FFmpeg] Conversion error:', err.message);
        reject(err);
      })
      .on('end', () => {
        console.log('✅ [FFmpeg] Converted to WAV successfully');
        resolve(outputPath);
      })
      .save(outputPath);
  });
};

/**
 * Read and decode WAV file to Float32Array for Whisper
 */
const readWavFile = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const audioData = await wavDecoder.decode(buffer);
  
  // Get the first channel (mono)
  let samples = audioData.channelData[0];
  
  // If stereo, average the channels
  if (audioData.channelData.length > 1) {
    const left = audioData.channelData[0];
    const right = audioData.channelData[1];
    samples = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      samples[i] = (left[i] + right[i]) / 2;
    }
  }
  
  console.log(`📊 [Audio] Decoded: ${audioData.sampleRate}Hz, ${samples.length} samples`);
  return samples;
};

// System prompt for generating responses
const RESPONSE_SYSTEM_PROMPT = `You are ISHA (Intelligent System for Helpful Assistance), a personal health and fitness AI assistant.

ABOUT YOU:
- Your name is ISHA, which stands for "Intelligent System for Helpful Assistance"
- You help users track and manage their workouts, diet, meals, sleep, shopping lists, wishlists, reminders, body measurements, step counting, and provide health analytics
- You are friendly, supportive, and focused on helping users achieve their health goals

CRITICAL RULES:
1. MAX 1-2 sentences for ANY response (except when asked who you are)
2. NEVER ask follow-up questions after adding items
3. NEVER ask for brand, type, category, or details
4. Just confirm what was done and stop
5. When asked "who are you" or about yourself, introduce yourself warmly

Examples of GOOD responses:
- "Added milk to your shopping list! 🛒"
- "Done! Logged 5000 steps for today 👟"
- "Created reminder: take vitamins at 8am ⏰"

Examples of BAD responses (NEVER do this):
- "I've added milk to your shopping list! Would you like to specify the brand or quantity?"
- "Done! I added eggs. What type of eggs - organic, free-range?"
- "Created your reminder. Would you like me to set any more reminders?"`;

/**
 * Generate a direct confirmation for successful actions WITHOUT calling LLM
 */
/**
 * Check if the user is asking about ISHA's identity
 */
const isIdentityQuestion = (message) => {
  const identityPatterns = [
    /who\s+(are|r)\s+(you|u)/i,
    /what\s+(are|r)\s+(you|u)/i,
    /your\s+name/i,
    /what('s|\s+is)\s+your\s+name/i,
    /tell\s+me\s+about\s+(yourself|you|urself)/i,
    /introduce\s+(yourself|urself)/i,
    /what\s+do\s+you\s+do/i,
    /what\s+can\s+you\s+do/i,
    /what('s|\s+is)\s+isha/i,
    /who('s|\s+is)\s+isha/i,
  ];
  return identityPatterns.some(pattern => pattern.test(message));
};

/**
 * Check if the user is asking who built ISHA
 */
const isCreatorQuestion = (message) => {
  const creatorPatterns = [
    /who\s+(built|made|created|developed|designed)\s+(you|u|isha)/i,
    /who('s|'re|\s+is|\s+are)\s+(your|isha'?s?)\s+(creator|developer|maker|builder|author)/i,
    /your\s+(creator|developer|maker|builder)/i,
    /made\s+by\s+who/i,
    /built\s+by\s+who/i,
    /created\s+by\s+who/i,
    /who\s+made\s+u/i,
    /who\s+built\s+u/i,
    /who\s+created\s+u/i,
  ];
  return creatorPatterns.some(pattern => pattern.test(message));
};

/**
 * Check if the user is asking about Adam Jackhammer
 */
const isAdamQuestion = (message) => {
  const adamPatterns = [
    /who('s|\s+is)\s+adam\s*jack\s*hammer/i,
    /adam\s*jack\s*hammer/i,
    /tell\s+me\s+about\s+adam/i,
    /who\s+is\s+that/i,
  ];
  return adamPatterns.some(pattern => pattern.test(message));
};

/**
 * Generate creator response
 */
const getCreatorResponse = () => {
  return `🔧 I was built by **Adam Jackhammer**! He's the mastermind behind my creation. 🧠✨`;
};

/**
 * Generate Adam Jackhammer response (classified)
 */
const getAdamResponse = () => {
  return `🔒 **CLASSIFIED INFORMATION**

That information is not to be disclosed. Some things are better left mysterious! 🕵️‍♂️`;
};

/**
 * Generate ISHA's identity response
 */
const getIdentityResponse = () => {
  return `👋 Hi! I'm ISHA - Intelligent System for Helpful Assistance!

🎯 I'm your personal health and fitness AI assistant. Here's how I can help you:

💪 **Workouts** - Track and log your exercises
🍽️ **Diet & Meals** - Monitor what you eat and plan meals
👨‍🍳 **Recipes** - Manage your weekly meal plans
👟 **Steps** - Track your daily step count
📏 **Body Measurements** - Record weight, height, and other metrics
⏰ **Reminders** - Set health and fitness reminders
🛒 **Shopping List** - Manage your grocery list
💝 **Wishlist** - Track items you want to buy
📊 **Analytics** - View your health insights and progress

Just talk to me naturally and I'll help you stay on track with your health goals! 🚀`;
};

const generateDirectConfirmation = (classification, actionResult) => {
  const { entity } = classification;
  const { action, message, data } = actionResult;
  
  // Use the message from action result if available
  if (message) {
    const emoji = {
      'shopping': '🛒',
      'wishlist': '💝',
      'workout': '💪',
      'diet': '🍽️',
      'recipe': '👨‍🍳',
      'reminder': '⏰',
      'steps': '👟',
      'measurement': '📏',
    };
    return `${emoji[entity] || '✅'} ${message}`;
  }
  
  // Fallback confirmations
  switch (entity) {
    case 'shopping':
      return `🛒 Added to shopping list!`;
    case 'wishlist':
      return `💝 Added to wishlist!`;
    case 'workout':
      return `💪 Workout logged!`;
    case 'diet':
      return `🍽️ Meal logged!`;
    case 'recipe':
      return `👨‍🍳 Recipe saved!`;
    case 'reminder':
      return `⏰ Reminder created!`;
    case 'steps':
      return `👟 Steps recorded!`;
    case 'measurement':
      return `📏 Measurement updated!`;
    default:
      return `✅ Done!`;
  }
};

/**
 * Generate a natural language response using context and action results
 */
const generateResponse = async (userMessage, classification, context, actionResult = null) => {
  try {
    // For SUCCESSFUL actions, skip LLM and return direct confirmation
    if (actionResult?.success) {
      return generateDirectConfirmation(classification, actionResult);
    }
    
    // For FAILED actions, return error message directly
    if (actionResult && !actionResult.success) {
      return `❌ ${actionResult.error || 'Something went wrong. Please try again.'}`;
    }
    
    // For queries, use LLM or fallback
    // Build the context message for the LLM
    let contextMessage = `User's message: "${userMessage}"\n\n`;
    contextMessage += `Classified as: ${classification.intent} on ${classification.entity}\n\n`;
    
    // Add relevant context data
    if (context && Object.keys(context).length > 0) {
      contextMessage += `Relevant data from database:\n${JSON.stringify(context, null, 2)}\n\n`;
    }

    contextMessage += `Respond in 1-2 sentences MAX. Just give the info, no questions.`;

    const response = await ollama.chat({
      model: 'mistral',
      messages: [
        { role: 'system', content: RESPONSE_SYSTEM_PROMPT },
        { role: 'user', content: contextMessage }
      ],
      options: {
        temperature: 0.5,
        num_predict: 150,  // Limit response length
      }
    });

    return response.message.content;

  } catch (error) {
    console.error('❌ [AI] Response generation error:', error.message);
    
    // Fallback response generation
    return generateFallbackResponse(classification, context, actionResult);
  }
};

/**
 * Fallback response when LLM fails - IMPROVED with actual data
 */
const generateFallbackResponse = (classification, context, actionResult) => {
  const { intent, entity } = classification;

  // Action responses
  if (actionResult?.success) {
    return `✅ ${actionResult.message || `${actionResult.action} successfully!`}`;
  }

  if (actionResult?.error) {
    return `❌ Sorry, I couldn't complete that action: ${actionResult.error}`;
  }

  // Query responses with actual data
  if (intent === INTENTS.QUERY || intent === INTENTS.CHAT) {
    // Check for "today's" specific responses first
    if (context?.isToday) {
      // Today's workouts
      if (entity === ENTITIES.WORKOUT && context.workouts) {
        const workouts = context.workouts;
        const dayName = context.dayName;
        if (workouts.length > 0) {
          const workoutList = workouts.map(w => `• ${w.workout_name} - ${w.sets}x${w.reps}${w.weights ? ` @ ${w.weights}kg` : ''}`).join('\n');
          return `🏋️ ${dayName}'s Workouts (${workouts.length}):\n\n${workoutList}`;
        }
        return `🏋️ No workouts scheduled for ${dayName}. Would you like to add some?`;
      }
      
      // Today's meals
      if ((entity === ENTITIES.DIET || entity === ENTITIES.RECIPE) && context.mealsByType) {
        const { mealsByType, dayName, totalCalories } = context;
        let response = `🍽️ ${dayName}'s Meals:\n\n`;
        
        const mealTypes = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
        mealTypes.forEach(type => {
          const meal = mealsByType[type];
          if (meal) {
            response += `${type}: ${meal.name || meal.food_name}${meal.calories ? ` (${meal.calories} cal)` : ''}\n`;
          } else {
            response += `${type}: Not planned\n`;
          }
        });
        
        response += `\n📊 Total: ${totalCalories} calories`;
        return response;
      }
      
      // Today's analytics
      if (entity === ENTITIES.ANALYTICS || context.macros) {
        const { dayName, steps, caloriesPlanned, caloriesBurnt, macros } = context;
        let response = `📊 ${dayName}'s Analytics:\n\n`;
        response += `🚶 Steps: ${steps || 0}\n`;
        response += `🍽️ Calories Planned: ${caloriesPlanned || 0}\n`;
        response += `🔥 Calories Burnt: ${caloriesBurnt || 0}\n`;
        response += `📈 Net Calories: ${(caloriesPlanned || 0) - (caloriesBurnt || 0)}\n\n`;
        
        if (macros) {
          response += `💪 Macros:\n`;
          response += `• Protein: ${macros.protein || 0}g\n`;
          response += `• Carbs: ${macros.carbs || 0}g\n`;
          response += `• Fats: ${macros.fats || 0}g`;
        }
        return response;
      }
      
      // Today's reminders
      if (entity === ENTITIES.REMINDER && context.reminders !== undefined) {
        const reminders = context.reminders;
        if (reminders.length > 0) {
          const reminderList = reminders.map(r => `• ${r.reminder_name} at ${r.reminder_time}`).join('\n');
          return `⏰ Today's Reminders (${reminders.length}):\n\n${reminderList}`;
        }
        return `⏰ No reminders for today. Would you like to set one?`;
      }
    }
    
    // Regular (non-today) queries
    switch (entity) {
      case ENTITIES.STEPS:
        const todaySteps = context?.today?.steps || 0;
        const totalSteps = context?.summary?.total_steps || 0;
        const avgSteps = Math.round(context?.summary?.avg_steps || 0);
        return `📊 Steps Summary:\n• Today: ${todaySteps} steps\n• Total: ${totalSteps} steps\n• Average: ${avgSteps} steps/day\nKeep moving! 💪`;
      
      case ENTITIES.WORKOUT:
        const workouts = context?.workouts || [];
        const totalWorkouts = context?.summary?.total_workouts || workouts.length;
        if (workouts.length > 0) {
          const recentList = workouts.slice(0, 3).map(w => `• ${w.workout_name} (${w.sets}x${w.reps})`).join('\n');
          return `🏋️ You have ${totalWorkouts} workouts logged!\n\nRecent workouts:\n${recentList}`;
        }
        return `🏋️ No workouts logged yet. Would you like to add one?`;
      
      case ENTITIES.DIET:
        const meals = context?.meals || [];
        const totalCalories = context?.nutrition?.total_calories || 0;
        if (meals.length > 0) {
          const recentMeals = meals.slice(0, 3).map(m => `• ${m.food_name} (${m.calories || 0} cal)`).join('\n');
          return `🍽️ Diet Summary:\n• Total calories: ${Math.round(totalCalories)}\n\nRecent meals:\n${recentMeals}`;
        }
        return `🍽️ No meals logged yet. Tell me what you ate!`;
      
      case ENTITIES.MEASUREMENT:
        const latest = context?.latest;
        if (latest) {
          let msg = `📏 Your Measurements:\n`;
          if (latest.weight) msg += `• Weight: ${latest.weight} kg\n`;
          if (latest.height) msg += `• Height: ${latest.height} cm\n`;
          if (context.bmi) msg += `• BMI: ${context.bmi}\n`;
          if (latest.chest) msg += `• Chest: ${latest.chest} cm\n`;
          if (latest.waist) msg += `• Waist: ${latest.waist} cm\n`;
          return msg;
        }
        return `📏 No measurements recorded yet. Would you like to log your weight?`;
      
      case ENTITIES.REMINDER:
        const reminders = context?.reminders || [];
        if (reminders.length > 0) {
          const list = reminders.slice(0, 5).map(r => `• ${r.reminder_name} at ${r.reminder_time}`).join('\n');
          return `⏰ Your Reminders:\n${list}`;
        }
        return `⏰ No reminders set. Would you like to create one?`;
      
      case ENTITIES.SHOPPING:
        const pending = context?.pending || [];
        if (pending.length > 0) {
          const list = pending.slice(0, 5).map(i => `• ${i.item_name}`).join('\n');
          return `🛒 Shopping List (${pending.length} items):\n${list}`;
        }
        return `🛒 Your shopping list is empty!`;
      
      case ENTITIES.WISHLIST:
        const wishItems = context?.items || [];
        if (wishItems.length > 0) {
          const list = wishItems.slice(0, 5).map(i => `• ${i.item_name}`).join('\n');
          return `💝 Wishlist (${wishItems.length} items):\n${list}`;
        }
        return `💝 Your wishlist is empty!`;
      
      case ENTITIES.ANALYTICS:
        // Analytics query (not today-specific)
        const analyticsOverview = context?.overview || {};
        let analyticsResponse = `📊 Your Analytics:\n`;
        if (analyticsOverview.totalSteps) analyticsResponse += `• Total Steps: ${analyticsOverview.totalSteps}\n`;
        if (analyticsOverview.avgSteps) analyticsResponse += `• Avg Steps/Day: ${analyticsOverview.avgSteps}\n`;
        if (analyticsOverview.totalWorkouts) analyticsResponse += `• Total Workouts: ${analyticsOverview.totalWorkouts}\n`;
        return analyticsResponse;
      
      case ENTITIES.GENERAL:
      default:
        // Comprehensive overview
        const overview = context?.overview || {};
        const latestM = context?.latestMeasurement;
        let response = `📊 Your Progress Summary:\n`;
        if (overview.totalSteps) response += `• Total Steps: ${overview.totalSteps}\n`;
        if (overview.avgSteps) response += `• Avg Steps/Day: ${overview.avgSteps}\n`;
        if (overview.totalWorkouts) response += `• Total Workouts: ${overview.totalWorkouts}\n`;
        if (latestM?.weight) response += `• Current Weight: ${latestM.weight} kg\n`;
        if (latestM?.height) response += `• Height: ${latestM.height} cm\n`;
        if (overview.bmi) response += `• BMI: ${overview.bmi}\n`;
        
        if (response === `📊 Your Progress Summary:\n`) {
          return `👋 Hey! I'm ISHA, your fitness assistant. Ask me about your steps, workouts, weight, diet, or any fitness data!`;
        }
        return response;
    }
  }

  return `👋 Hey! I'm ISHA, your fitness assistant. How can I help you today?`;
};

/**
 * Extract action details from LLM for complex add/update operations
 */
const extractActionDetails = async (userMessage, classification) => {
  try {
    const extractionPrompt = `Extract specific values from this user message for a ${classification.entity} ${classification.intent} operation.

User message: "${userMessage}"

Based on the entity type "${classification.entity}", extract ALL relevant values mentioned.

ENTITY SCHEMAS:
- workout: {"workout_name": "exercise name", "sets": number, "reps": number, "weights": number (kg), "date": "today/yesterday/tomorrow/Monday/Tuesday/etc"}
- diet: {"food_name": "food item", "meal_type": "breakfast/lunch/dinner/snack", "calories": number, "date": "today"}
- steps: {"steps": number, "date": "today/yesterday/date"}
- measurement: {"name": "body part or strength lift (weight/height/neck/chest/waist/stomach/shoulder/left_bicep/right_bicep/left_forearm/right_forearm/left_leg/right_leg/left_calf/right_calf/bench/overhead_press/ohp/rows/squats/deadlift)", "value": number}
- reminder: {"reminder_name": "title/description", "reminder_time": "HH:MM in 24h format", "date": "YYYY-MM-DD or today"}
- shopping: {"item_name": "single item" OR "items": ["item1", "item2"], "quantity": number}
- wishlist: {"item_name": "item name", "description": "details", "price": number}
- recipe: {"food_name": "recipe name", "week": number (1-5), "day": "Day 1" to "Day 7", "meal_type": "Breakfast/Lunch/Snack/Dinner", "ingredients": ["ingredient1", "ingredient2"], "calories": number}

IMPORTANT RULES:
1. For times like "3pm" convert to 24h format: "15:00"
2. For times like "9am" use: "09:00"
3. For "remind me to X" the reminder_name is "X"
4. If multiple shopping items mentioned, use the "items" array
5. Use null for values not mentioned
6. Always try to extract a name/title for the item
7. For day names like "on Thursday", "for Monday", extract as date: "Thursday", "Monday"
8. For recipes: "week 1 day 2" means week: 1, day: "Day 2". Meal types are Breakfast, Lunch, Snack, Dinner

Respond ONLY with valid JSON containing the extracted values.
Examples:
- "Remind me to take vitamins at 8am" → {"reminder_name": "take vitamins", "reminder_time": "08:00"}
- "Add 3 sets of 10 squats" → {"workout_name": "squats", "sets": 3, "reps": 10}
- "Add skipping to workout on Thursday" → {"workout_name": "skipping", "date": "Thursday"}
- "Add push ups for Monday" → {"workout_name": "push ups", "date": "Monday"}
- "I did bench press yesterday" → {"workout_name": "bench press", "date": "yesterday"}
- "Add eggs, milk, bread to shopping" → {"items": ["eggs", "milk", "bread"]}
- "Add milk to shopping list" → {"item_name": "milk"}
- "Add protein powder to my wishlist" → {"item_name": "protein powder"}
- "Set neck to 22" → {"name": "neck", "value": 22}
- "Change my chest to 40" → {"name": "chest", "value": 40}
- "Add my left bicep 14" → {"name": "left_bicep", "value": 14}
- "Update shoulder to 48" → {"name": "shoulder", "value": 48}
- "My waist is 32 inches" → {"name": "waist", "value": 32}
- "Set bench to 80" → {"name": "bench", "value": 80}
- "My deadlift max is 120" → {"name": "deadlift", "value": 120}
- "Change squats to 100" → {"name": "squats", "value": 100}
- "Set overhead press to 50" → {"name": "overhead_press", "value": 50}
- "Update rows to 60" → {"name": "rows", "value": 60}
- "Delete skipping from workout" → {"workout_name": "skipping"}
- "Remove bench press" → {"workout_name": "bench press"}
- "Delete milk from shopping list" → {"item_name": "milk"}
- "Clear neck" → {"name": "neck"}
- "Add corn peas masala on week 1 day 2 for dinner" → {"food_name": "corn peas masala", "week": 1, "day": "Day 2", "meal_type": "Dinner"}
- "Add oatmeal to recipes for breakfast week 2 day 3" → {"food_name": "oatmeal", "week": 2, "day": "Day 3", "meal_type": "Breakfast"}
- "Add grilled chicken for lunch on week 1 day 5" → {"food_name": "grilled chicken", "week": 1, "day": "Day 5", "meal_type": "Lunch"}
- "Add eggs to lunch week 1 day 1" → {"food_name": "eggs", "week": 1, "day": "Day 1", "meal_type": "Lunch"}
- "Add pasta to dinner week 2 day 4" → {"food_name": "pasta", "week": 2, "day": "Day 4", "meal_type": "Dinner"}`;

    const response = await ollama.chat({
      model: 'mistral',
      messages: [
        { role: 'system', content: 'You are a data extraction assistant. Extract values and return ONLY valid JSON. Be precise with the field names.' },
        { role: 'user', content: extractionPrompt }
      ],
      format: 'json',
      options: {
        temperature: 0.1,
      }
    });

    const extracted = JSON.parse(response.message.content);
    
    // If extraction returned empty or no useful values, use fallback
    if (!extracted || Object.keys(extracted).length === 0) {
      return fallbackExtraction(userMessage, classification);
    }
    
    return extracted;

  } catch (error) {
    console.error('❌ [AI] Extraction error:', error.message);
    // Use fallback extraction instead of empty object
    return fallbackExtraction(userMessage, classification);
  }
};

/**
 * Fallback extraction when LLM fails - extract item names directly from message
 */
const fallbackExtraction = (userMessage, classification) => {
  const message = userMessage.toLowerCase();
  const entity = classification.entity;
  
  console.log('🔧 [AI] Using fallback extraction for:', entity);
  
  // Common patterns to remove from messages
  const removePatterns = [
    /^(please\s+)?(add|delete|remove|clear)\s+/i,
    /\s+(from\s+)?(my\s+)?(workout|workouts|shopping\s*list|wishlist|cart|list)$/i,
    /\s+to\s+(my\s+)?(shopping\s*list|wishlist|cart|list)$/i,
    /\s+in\s+(my\s+)?(shopping\s*list|wishlist|cart|list)$/i,
    /^(can you\s+)?put\s+/i,
    /^i\s+(want|need)\s+(to\s+)?(add\s+)?/i,
  ];
  
  let cleaned = userMessage;
  for (const pattern of removePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  cleaned = cleaned.trim();
  
  // Check for multiple items (separated by "and", ",", or "&")
  const multiItems = cleaned.split(/\s*(?:,|and|&)\s*/i).filter(item => item.trim().length > 0);
  
  switch (entity) {
    case 'shopping':
      if (multiItems.length > 1) {
        return { items: multiItems.map(i => i.trim()) };
      }
      return { item_name: cleaned || userMessage };
      
    case 'wishlist':
      return { item_name: cleaned || userMessage };
      
    case 'reminder':
      // Try to extract time
      const timeMatch = message.match(/(\d{1,2})\s*(am|pm)|(\d{1,2}):(\d{2})/i);
      let time = null;
      if (timeMatch) {
        if (timeMatch[1] && timeMatch[2]) {
          let hour = parseInt(timeMatch[1]);
          if (timeMatch[2].toLowerCase() === 'pm' && hour < 12) hour += 12;
          if (timeMatch[2].toLowerCase() === 'am' && hour === 12) hour = 0;
          time = `${hour.toString().padStart(2, '0')}:00`;
        } else if (timeMatch[3] && timeMatch[4]) {
          time = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`;
        }
      }
      const reminderName = cleaned.replace(/\s*(at\s+)?\d{1,2}(:\d{2})?\s*(am|pm)?/gi, '').trim();
      return { reminder_name: reminderName || cleaned, reminder_time: time };
      
    case 'workout':
      return { workout_name: cleaned || 'Workout' };
      
    case 'diet':
      return { food_name: cleaned || 'Food' };
      
    case 'recipe':
      // Extract week, day, meal_type, and food_name from message
      const weekMatch = message.match(/week\s*(\d+)/i);
      const dayMatch = message.match(/day\s*(\d+)/i);
      const mealMatch = message.match(/(?:for|to)\s+(breakfast|lunch|dinner|snack)/i);
      
      // Clean the food name by removing week/day/meal references
      let foodName = cleaned
        .replace(/week\s*\d+/gi, '')
        .replace(/day\s*\d+/gi, '')
        .replace(/(?:for|to)\s+(breakfast|lunch|dinner|snack)/gi, '')
        .replace(/on\s+/gi, '')
        .replace(/to\s+recipes?/gi, '')
        .trim();
      
      return {
        food_name: foodName || 'Recipe',
        week: weekMatch ? parseInt(weekMatch[1]) : 1,
        day: dayMatch ? `Day ${dayMatch[1]}` : 'Day 1',
        meal_type: mealMatch ? mealMatch[1].charAt(0).toUpperCase() + mealMatch[1].slice(1).toLowerCase() : 'Snack'
      };
      
    case 'measurement':
      // Extract body part name and value
      const measurementParts = ['weight', 'height', 'neck', 'chest', 'waist', 'stomach', 'shoulder', 
        'left bicep', 'right bicep', 'left forearm', 'right forearm', 
        'left leg', 'right leg', 'left calf', 'right calf',
        // Strength max values
        'bench', 'bench press', 'overhead press', 'ohp', 'rows', 'row', 'squats', 'squat', 'deadlift'];
      const valueMatch = message.match(/(\d+(?:\.\d+)?)/);
      let measureName = null;
      for (const part of measurementParts) {
        if (message.includes(part)) {
          measureName = part.replace(' ', '_');
          break;
        }
      }
      return { 
        name: measureName || null, 
        value: valueMatch ? parseFloat(valueMatch[1]) : null 
      };
      
    default:
      return { name: cleaned };
  }
};

/**
 * Main chat handler
 */
export const handleChat = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('\n🤖 ═══════════════════════════════════════════════');
    console.log('📩 [AI] Received message:', message);

    // Check if user is asking about Adam Jackhammer (check this first!)
    if (isAdamQuestion(message)) {
      console.log('🔒 [AI] Adam Jackhammer question detected - CLASSIFIED');
      const adamResponse = getAdamResponse();
      const processingTime = Date.now() - startTime;
      console.log(`⏱️ [AI] Total processing time: ${processingTime}ms`);
      console.log('🤖 ═══════════════════════════════════════════════\n');
      
      return res.json({
        response: adamResponse,
        classification: {
          intent: 'chat',
          entity: 'general',
          confidence: 1.0
        },
        actionResult: null,
        processingTime
      });
    }

    // Check if user is asking who built/created ISHA
    if (isCreatorQuestion(message)) {
      console.log('🔧 [AI] Creator question detected');
      const creatorResponse = getCreatorResponse();
      const processingTime = Date.now() - startTime;
      console.log(`⏱️ [AI] Total processing time: ${processingTime}ms`);
      console.log('🤖 ═══════════════════════════════════════════════\n');
      
      return res.json({
        response: creatorResponse,
        classification: {
          intent: 'chat',
          entity: 'general',
          confidence: 1.0
        },
        actionResult: null,
        processingTime
      });
    }

    // Check if user is asking about ISHA's identity
    if (isIdentityQuestion(message)) {
      console.log('👋 [AI] Identity question detected');
      const identityResponse = getIdentityResponse();
      const processingTime = Date.now() - startTime;
      console.log(`⏱️ [AI] Total processing time: ${processingTime}ms`);
      console.log('🤖 ═══════════════════════════════════════════════\n');
      
      return res.json({
        response: identityResponse,
        classification: {
          intent: 'chat',
          entity: 'general',
          confidence: 1.0
        },
        actionResult: null,
        processingTime
      });
    }

    // Step 1: Classify intent
    const classification = await classifyIntent(message);
    console.log('🎯 [AI] Classification:', classification.intent, '→', classification.entity);

    // Step 2: Build database context
    const context = await buildContext(classification);
    console.log('📦 [AI] Context built with', Object.keys(context).length, 'keys');

    // Step 3: Execute action if needed (add/update/delete)
    let actionResult = null;
    if ([INTENTS.ADD, INTENTS.UPDATE, INTENTS.DELETE].includes(classification.intent)) {
      // Get values from classification fallback first
      let actionDetails = classification.details?.extracted_values || {};
      
      // Only use LLM extraction if fallback didn't provide good values
      // For reminders, check if we have reminder_name. For others, check relevant fields.
      const hasFallbackValues = classification.fallback && (
        (classification.entity === 'reminder' && actionDetails.reminder_name) ||
        (classification.entity === 'shopping' && (actionDetails.item_name || actionDetails.items)) ||
        (classification.entity === 'wishlist' && actionDetails.item_name) ||
        (classification.entity === 'workout' && actionDetails.workout_name) ||
        (classification.entity === 'steps' && actionDetails.steps) ||
        (classification.entity === 'measurement' && actionDetails.name) ||
        (classification.entity === 'recipe' && actionDetails.food_name)
      );
      
      if (!hasFallbackValues) {
        // Fallback didn't provide enough, try LLM extraction
        const llmDetails = await extractActionDetails(message, classification);
        // Merge LLM details with fallback, preferring fallback for dates
        actionDetails = { ...llmDetails, ...actionDetails };
      }
      
      console.log('📝 [AI] Extracted values:', actionDetails);
      
      actionResult = await executeAction(classification, actionDetails);
      console.log('⚡ [AI] Action result:', actionResult.success ? '✅ Success' : '❌ Failed');
    }

    // Step 4: Generate natural language response
    const responseText = await generateResponse(message, classification, context, actionResult);
    console.log('💬 [AI] Response generated:', responseText);

    const processingTime = Date.now() - startTime;
    console.log(`⏱️ [AI] Total processing time: ${processingTime}ms`);
    console.log('🤖 ═══════════════════════════════════════════════\n');

    res.json({
      response: responseText || 'Message processed successfully',
      classification: {
        intent: classification.intent,
        entity: classification.entity,
        confidence: classification.confidence
      },
      actionResult: actionResult,
      processingTime
    });

  } catch (error) {
    console.error('❌ [AI] Chat error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: error.message,
      response: "I'm having trouble processing that right now. Please try again! 🙏"
    });
  }
};

/**
 * Health check for AI service
 */
export const checkHealth = async (req, res) => {
  try {
    // Check if Ollama is running
    const response = await ollama.list();
    
    const hasMistral = response.models?.some(m => m.name.includes('mistral'));
    
    res.json({
      status: 'ok',
      ollama: 'connected',
      models: response.models?.map(m => m.name) || [],
      mistralAvailable: hasMistral,
      message: hasMistral 
        ? '✅ ISHA AI is ready!' 
        : '⚠️ Mistral model not found. Run: ollama pull mistral'
    });

  } catch (error) {
    res.status(503).json({
      status: 'error',
      ollama: 'disconnected',
      message: '❌ Cannot connect to Ollama. Make sure Ollama is running: ollama serve',
      error: error.message
    });
  }
};

/**
 * Transcribe audio to text using Whisper
 */
export const transcribeAudio = async (req, res) => {
  let wavPath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioPath = req.file.path;
    const absolutePath = path.resolve(audioPath);
    console.log('🎤 [Transcribe] Received audio file:', absolutePath);
    console.log('📁 [Transcribe] File size:', req.file.size, 'bytes');

    try {
      // Get the Whisper pipeline
      const transcriber = await getWhisperPipeline();
      
      console.log('🔄 [Transcribe] Converting audio to WAV format...');
      
      // Convert to proper WAV format using FFmpeg
      wavPath = await convertToWav(absolutePath);
      
      console.log('🔄 [Transcribe] Decoding WAV file...');
      
      // Decode WAV file to Float32Array
      const audioData = await readWavFile(wavPath);
      
      console.log('🔄 [Transcribe] Processing audio with Whisper...');
      console.log('📊 [Transcribe] Audio samples:', audioData.length);
      
      // Transcribe the audio
      const result = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false,
      });

      const transcribedText = result.text?.trim() || '';
      
      console.log('✅ [Transcribe] Result:', transcribedText);

      // Clean up uploaded files
      fs.unlink(audioPath, (err) => {
        if (err) console.log('Warning: Could not delete original audio file');
      });
      if (wavPath) {
        fs.unlink(wavPath, (err) => {
          if (err) console.log('Warning: Could not delete converted wav file');
        });
      }

      if (transcribedText) {
        res.json({ text: transcribedText });
      } else {
        res.json({ 
          text: '', 
          message: 'Could not detect speech. Please try speaking clearly.' 
        });
      }

    } catch (whisperError) {
      console.error('❌ [Transcribe] Whisper error:', whisperError);
      
      // Clean up files on error
      fs.unlink(audioPath, () => {});
      if (wavPath) {
        fs.unlink(wavPath, () => {});
      }
      
      res.status(500).json({ 
        error: 'Transcription failed', 
        message: 'Could not process audio. The model may still be loading.',
        details: whisperError.message 
      });
    }

  } catch (error) {
    console.error('❌ [Transcribe] Error:', error);
    res.status(500).json({ error: 'Transcription failed', details: error.message });
  }
};

export default {
  handleChat,
  checkHealth,
  transcribeAudio,
};
