import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://localhost:11434' });

// Embedding model - nomic-embed-text is fast and good for semantic search
const EMBEDDING_MODEL = 'nomic-embed-text';

/**
 * Intent corpus - example queries mapped to intent + entity
 * The more examples, the better the matching
 */
const INTENT_CORPUS = [
  // ============= WORKOUT =============
  // ADD
  { text: "add push ups", intent: "add", entity: "workout" },
  { text: "add squats to my workout", intent: "add", entity: "workout" },
  { text: "log bench press", intent: "add", entity: "workout" },
  { text: "i did 3 sets of 10 push ups", intent: "add", entity: "workout" },
  { text: "add deadlift with 100kg", intent: "add", entity: "workout" },
  { text: "record my workout", intent: "add", entity: "workout" },
  { text: "add pull ups for today", intent: "add", entity: "workout" },
  { text: "i completed 5 sets of curls", intent: "add", entity: "workout" },
  { text: "log 4 sets of 12 reps shoulder press", intent: "add", entity: "workout" },
  // QUERY
  { text: "show my workouts", intent: "query", entity: "workout" },
  { text: "what workouts did I do today", intent: "query", entity: "workout" },
  { text: "list my exercises", intent: "query", entity: "workout" },
  { text: "today's workouts", intent: "query", entity: "workout" },
  { text: "show today's workout", intent: "query", entity: "workout" },
  { text: "what exercises have I done", intent: "query", entity: "workout" },
  // DELETE
  { text: "delete squats from workout", intent: "delete", entity: "workout" },
  { text: "remove bench press", intent: "delete", entity: "workout" },
  { text: "cancel my push ups workout", intent: "delete", entity: "workout" },

  // ============= DIET =============
  // ADD (mark eaten)
  { text: "i had breakfast", intent: "add", entity: "diet" },
  { text: "i ate lunch", intent: "add", entity: "diet" },
  { text: "had dinner today", intent: "add", entity: "diet" },
  { text: "mark breakfast as eaten", intent: "add", entity: "diet" },
  { text: "i finished my snack", intent: "add", entity: "diet" },
  { text: "i had lunch and dinner", intent: "add", entity: "diet" },
  { text: "ate breakfast lunch and snack", intent: "add", entity: "diet" },
  // QUERY
  { text: "what did i eat today", intent: "query", entity: "diet" },
  { text: "show my meals", intent: "query", entity: "diet" },
  { text: "today's meals", intent: "query", entity: "diet" },
  { text: "list my food log", intent: "query", entity: "diet" },
  { text: "how many calories did i consume", intent: "query", entity: "diet" },
  { text: "calories eaten today", intent: "query", entity: "diet" },
  { text: "what meals have i had", intent: "query", entity: "diet" },
  // DELETE
  { text: "i didn't have breakfast", intent: "delete", entity: "diet" },
  { text: "remove lunch from today", intent: "delete", entity: "diet" },
  { text: "unmark dinner", intent: "delete", entity: "diet" },

  // ============= RECIPE =============
  // ADD
  { text: "add oatmeal for breakfast week 1 day 1", intent: "add", entity: "recipe" },
  { text: "add chicken salad for lunch week 2 day 3", intent: "add", entity: "recipe" },
  { text: "add eggs to lunch week 1 day 1", intent: "add", entity: "recipe" },
  { text: "add pasta to dinner week 1 day 5", intent: "add", entity: "recipe" },
  { text: "add protein shake for snack", intent: "add", entity: "recipe" },
  { text: "add grilled fish to recipes", intent: "add", entity: "recipe" },
  { text: "create a new recipe for breakfast", intent: "add", entity: "recipe" },
  // QUERY
  { text: "show my recipes", intent: "query", entity: "recipe" },
  { text: "what's for lunch today", intent: "query", entity: "recipe" },
  { text: "show meal plan", intent: "query", entity: "recipe" },
  { text: "list my food recipes", intent: "query", entity: "recipe" },
  // DELETE
  { text: "delete the oatmeal recipe", intent: "delete", entity: "recipe" },
  { text: "remove pasta from recipes", intent: "delete", entity: "recipe" },

  // ============= STEPS =============
  // ADD
  { text: "add 5000 steps", intent: "add", entity: "steps" },
  { text: "log 8000 steps today", intent: "add", entity: "steps" },
  { text: "i walked 10000 steps", intent: "add", entity: "steps" },
  { text: "record 6500 steps", intent: "add", entity: "steps" },
  { text: "add my steps for today", intent: "add", entity: "steps" },
  // QUERY
  { text: "show my steps", intent: "query", entity: "steps" },
  { text: "how many steps today", intent: "query", entity: "steps" },
  { text: "step count", intent: "query", entity: "steps" },
  { text: "how far did i walk", intent: "query", entity: "steps" },
  // DELETE
  { text: "delete today's steps", intent: "delete", entity: "steps" },
  { text: "clear step count", intent: "delete", entity: "steps" },

  // ============= MEASUREMENT =============
  // ADD/UPDATE
  { text: "set my weight to 70kg", intent: "update", entity: "measurement" },
  { text: "update height to 175cm", intent: "update", entity: "measurement" },
  { text: "my weight is 72 kilos", intent: "add", entity: "measurement" },
  { text: "add chest measurement 40 inches", intent: "add", entity: "measurement" },
  { text: "set waist to 32", intent: "update", entity: "measurement" },
  { text: "update left bicep to 14 inches", intent: "update", entity: "measurement" },
  { text: "my neck is 15", intent: "add", entity: "measurement" },
  { text: "set bench press to 80kg", intent: "update", entity: "measurement" },
  { text: "change shoulder to 48", intent: "update", entity: "measurement" },
  // QUERY
  { text: "show my measurements", intent: "query", entity: "measurement" },
  { text: "what's my weight", intent: "query", entity: "measurement" },
  { text: "show my bmi", intent: "query", entity: "measurement" },
  { text: "list my body stats", intent: "query", entity: "measurement" },
  // DELETE
  { text: "clear neck measurement", intent: "delete", entity: "measurement" },
  { text: "delete waist", intent: "delete", entity: "measurement" },

  // ============= REMINDER =============
  // ADD
  { text: "remind me to drink water at 3pm", intent: "add", entity: "reminder" },
  { text: "set a reminder for gym tomorrow at 6am", intent: "add", entity: "reminder" },
  { text: "remind me to take vitamins at 8am", intent: "add", entity: "reminder" },
  { text: "create a reminder to buy groceries", intent: "add", entity: "reminder" },
  { text: "set reminder for workout at 5pm", intent: "add", entity: "reminder" },
  { text: "remind me about meeting at 10am", intent: "add", entity: "reminder" },
  // QUERY
  { text: "show my reminders", intent: "query", entity: "reminder" },
  { text: "what reminders do i have", intent: "query", entity: "reminder" },
  { text: "list today's reminders", intent: "query", entity: "reminder" },
  { text: "today's reminders", intent: "query", entity: "reminder" },
  // UPDATE
  { text: "change gym reminder to 7pm", intent: "update", entity: "reminder" },
  { text: "move water reminder to 4pm", intent: "update", entity: "reminder" },
  { text: "update reminder time", intent: "update", entity: "reminder" },
  { text: "reschedule my reminder", intent: "update", entity: "reminder" },
  { text: "turn off gym reminder", intent: "update", entity: "reminder" },
  { text: "disable water reminder", intent: "update", entity: "reminder" },
  { text: "enable gym reminder", intent: "update", entity: "reminder" },
  // DELETE
  { text: "delete gym reminder", intent: "delete", entity: "reminder" },
  { text: "remove water reminder", intent: "delete", entity: "reminder" },
  { text: "cancel my reminder", intent: "delete", entity: "reminder" },

  // ============= SHOPPING =============
  // ADD
  { text: "add milk to shopping list", intent: "add", entity: "shopping" },
  { text: "add eggs bread butter to shopping", intent: "add", entity: "shopping" },
  { text: "put rice on my grocery list", intent: "add", entity: "shopping" },
  { text: "i need to buy vegetables", intent: "add", entity: "shopping" },
  { text: "add fruits to shopping", intent: "add", entity: "shopping" },
  // QUERY
  { text: "show shopping list", intent: "query", entity: "shopping" },
  { text: "what's on my grocery list", intent: "query", entity: "shopping" },
  { text: "list items to buy", intent: "query", entity: "shopping" },
  // UPDATE
  { text: "change milk to almond milk in shopping", intent: "update", entity: "shopping" },
  { text: "update bread quantity to 2", intent: "update", entity: "shopping" },
  // DELETE
  { text: "remove milk from shopping list", intent: "delete", entity: "shopping" },
  { text: "delete eggs from grocery", intent: "delete", entity: "shopping" },

  // ============= WISHLIST =============
  // ADD
  { text: "add running shoes to wishlist", intent: "add", entity: "wishlist" },
  { text: "add iphone to my wishlist for 80000", intent: "add", entity: "wishlist" },
  { text: "i want to buy a laptop", intent: "add", entity: "wishlist" },
  { text: "add headphones to wishlist", intent: "add", entity: "wishlist" },
  // QUERY
  { text: "show my wishlist", intent: "query", entity: "wishlist" },
  { text: "what's on my wishlist", intent: "query", entity: "wishlist" },
  { text: "list wishlist items", intent: "query", entity: "wishlist" },
  // UPDATE
  { text: "change iphone price to 90000", intent: "update", entity: "wishlist" },
  { text: "set laptop priority to high", intent: "update", entity: "wishlist" },
  { text: "update running shoes price", intent: "update", entity: "wishlist" },
  // DELETE
  { text: "remove laptop from wishlist", intent: "delete", entity: "wishlist" },
  { text: "delete headphones from wishlist", intent: "delete", entity: "wishlist" },

  // ============= ANALYTICS =============
  // QUERY
  { text: "how many calories did i burn", intent: "query", entity: "analytics" },
  { text: "calories burnt today", intent: "query", entity: "analytics" },
  { text: "show my calorie burn", intent: "query", entity: "analytics" },
  { text: "what's my calorie expenditure", intent: "query", entity: "analytics" },
  { text: "how much did i burn from exercise", intent: "query", entity: "analytics" },
  { text: "today's analytics", intent: "query", entity: "analytics" },
  { text: "show my progress", intent: "query", entity: "analytics" },
  { text: "what are my stats", intent: "query", entity: "analytics" },
  { text: "show today's summary", intent: "query", entity: "analytics" },
  { text: "what are my macros today", intent: "query", entity: "analytics" },
  { text: "daily summary", intent: "query", entity: "analytics" },
  { text: "net calories today", intent: "query", entity: "analytics" },
  { text: "calorie balance", intent: "query", entity: "analytics" },

  // ============= GENERAL/CHAT =============
  { text: "hello", intent: "chat", entity: "general" },
  { text: "hi there", intent: "chat", entity: "general" },
  { text: "hey isha", intent: "chat", entity: "general" },
  { text: "how are you", intent: "chat", entity: "general" },
  { text: "what can you do", intent: "chat", entity: "general" },
  { text: "help me", intent: "chat", entity: "general" },
  { text: "thank you", intent: "chat", entity: "general" },
  { text: "thanks", intent: "chat", entity: "general" },
  { text: "good morning", intent: "chat", entity: "general" },
  { text: "good night", intent: "chat", entity: "general" },
];

// Cache for corpus embeddings (computed once on startup)
let corpusEmbeddings = null;
let isInitialized = false;
let initializationPromise = null;

/**
 * Generate embedding for a single text
 */
const getEmbedding = async (text) => {
  try {
    const response = await ollama.embeddings({
      model: EMBEDDING_MODEL,
      prompt: text
    });
    return response.embedding;
  } catch (error) {
    console.error('❌ [Embedding] Error generating embedding:', error.message);
    throw error;
  }
};

/**
 * Compute cosine similarity between two vectors
 */
const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Initialize corpus embeddings (run once on server start)
 */
export const initializeEmbeddings = async () => {
  if (isInitialized) return true;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      console.log('🚀 [Embedding] Initializing corpus embeddings...');
      console.log(`📚 [Embedding] Corpus size: ${INTENT_CORPUS.length} examples`);
      
      const startTime = Date.now();
      
      // Generate embeddings for all corpus entries
      corpusEmbeddings = [];
      for (let i = 0; i < INTENT_CORPUS.length; i++) {
        const item = INTENT_CORPUS[i];
        const embedding = await getEmbedding(item.text);
        corpusEmbeddings.push({
          ...item,
          embedding
        });
        
        // Log progress every 20 items
        if ((i + 1) % 20 === 0) {
          console.log(`📊 [Embedding] Progress: ${i + 1}/${INTENT_CORPUS.length}`);
        }
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ [Embedding] Corpus initialized in ${elapsed}ms`);
      isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ [Embedding] Initialization failed:', error.message);
      console.log('⚠️ [Embedding] Will fall back to keyword matching');
      isInitialized = false;
      return false;
    }
  })();

  return initializationPromise;
};

/**
 * Find the best matching intent for a user query using semantic similarity
 * @param {string} query - User's query
 * @param {number} threshold - Minimum similarity threshold (0-1)
 * @returns {Object} Best match with intent, entity, similarity, and matched text
 */
export const findBestMatch = async (query, threshold = 0.65) => {
  if (!isInitialized || !corpusEmbeddings) {
    console.log('⚠️ [Embedding] Not initialized, returning null');
    return null;
  }

  try {
    const startTime = Date.now();
    
    // Get embedding for user query
    const queryEmbedding = await getEmbedding(query.toLowerCase());
    
    // Find best match
    let bestMatch = null;
    let bestSimilarity = -1;
    
    for (const item of corpusEmbeddings) {
      const similarity = cosineSimilarity(queryEmbedding, item.embedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = item;
      }
    }
    
    const elapsed = Date.now() - startTime;
    
    if (bestMatch && bestSimilarity >= threshold) {
      console.log(`🎯 [Embedding] Match found: "${bestMatch.text}" (${(bestSimilarity * 100).toFixed(1)}%) in ${elapsed}ms`);
      return {
        intent: bestMatch.intent,
        entity: bestMatch.entity,
        similarity: bestSimilarity,
        matchedText: bestMatch.text,
        confidence: bestSimilarity
      };
    }
    
    console.log(`⚠️ [Embedding] No match above threshold. Best: "${bestMatch?.text}" (${(bestSimilarity * 100).toFixed(1)}%)`);
    return null;
  } catch (error) {
    console.error('❌ [Embedding] Search error:', error.message);
    return null;
  }
};

/**
 * Get top N matches for a query (useful for debugging)
 */
export const getTopMatches = async (query, n = 5) => {
  if (!isInitialized || !corpusEmbeddings) {
    return [];
  }

  try {
    const queryEmbedding = await getEmbedding(query.toLowerCase());
    
    const matches = corpusEmbeddings.map(item => ({
      ...item,
      similarity: cosineSimilarity(queryEmbedding, item.embedding)
    }));
    
    matches.sort((a, b) => b.similarity - a.similarity);
    
    return matches.slice(0, n).map(m => ({
      text: m.text,
      intent: m.intent,
      entity: m.entity,
      similarity: (m.similarity * 100).toFixed(1) + '%'
    }));
  } catch (error) {
    console.error('❌ [Embedding] Top matches error:', error.message);
    return [];
  }
};

/**
 * Check if embedding service is ready
 */
export const isReady = () => isInitialized;

export default {
  initializeEmbeddings,
  findBestMatch,
  getTopMatches,
  isReady
};
