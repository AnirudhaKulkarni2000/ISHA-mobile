import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// OpenAI Whisper Configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key'
});

// Whisper model - using whisper-1 (latest)
const WHISPER_MODEL = 'whisper-1';

/**
 * Convert speech audio to text using OpenAI Whisper
 * @param {Buffer|string} audioData - Audio file buffer or base64 string
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Transcription result
 */
export const transcribeAudio = async (audioData, options = {}) => {
  try {
    // If audioData is base64, convert to buffer
    let audioBuffer = audioData;
    if (typeof audioData === 'string') {
      audioBuffer = Buffer.from(audioData, 'base64');
    }
    
    // Create a temporary file for the audio
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `audio_${Date.now()}.wav`);
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    // Create file stream for OpenAI
    const audioFile = fs.createReadStream(tempFilePath);
    
    const transcriptionOptions = {
      file: audioFile,
      model: WHISPER_MODEL,
      language: 'en', // English only as requested
      response_format: options.responseFormat || 'json'
    };
    
    // Optional: Add prompt for better accuracy
    if (options.prompt) {
      transcriptionOptions.prompt = options.prompt;
    }
    
    // Optional: Get word-level timestamps
    if (options.withTimestamps) {
      transcriptionOptions.response_format = 'verbose_json';
      transcriptionOptions.timestamp_granularities = ['word'];
    }

    const response = await openai.audio.transcriptions.create(transcriptionOptions);
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    return {
      success: true,
      transcript: response.text || response,
      language: 'en',
      languageName: 'English',
      duration: response.duration || null,
      words: response.words || null,
      rawResponse: response
    };
  } catch (error) {
    console.error('Whisper Speech-to-Text Error:', error);
    return {
      success: false,
      error: error.message,
      transcript: null
    };
  }
};

/**
 * Transcribe audio from file path
 * @param {string} filePath - Path to audio file
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Transcription result
 */
export const transcribeFromFile = async (filePath, options = {}) => {
  try {
    const audioFile = fs.createReadStream(filePath);
    
    const transcriptionOptions = {
      file: audioFile,
      model: WHISPER_MODEL,
      language: 'en',
      response_format: options.responseFormat || 'json'
    };
    
    if (options.prompt) {
      transcriptionOptions.prompt = options.prompt;
    }

    const response = await openai.audio.transcriptions.create(transcriptionOptions);
    
    return {
      success: true,
      transcript: response.text || response,
      language: 'en',
      languageName: 'English',
      duration: response.duration || null,
      rawResponse: response
    };
  } catch (error) {
    console.error('Whisper File Transcription Error:', error);
    return {
      success: false,
      error: error.message,
      transcript: null
    };
  }
};

/**
 * Transcribe audio for ISHA assistant (optimized for commands)
 * @param {Buffer|string} audioData - Audio file buffer or base64 string
 * @returns {Promise<Object>} - Transcription result formatted for ISHA
 */
export const transcribeForISHA = async (audioData) => {
  // Add context prompt for better ISHA command recognition
  const result = await transcribeAudio(audioData, {
    prompt: 'ISHA personal assistant commands: workout, diet, reminder, shopping, wishlist, steps, analytics'
  });
  
  if (!result.success) {
    return result;
  }
  
  // Process transcript for ISHA commands
  const processedTranscript = result.transcript
    .trim()
    .toLowerCase();
  
  // Detect intent keywords
  const intents = detectIntents(processedTranscript);
  
  return {
    ...result,
    processedTranscript,
    intents,
    isCommand: intents.length > 0
  };
};

/**
 * Detect intents from transcribed text
 * @param {string} text - Transcribed text
 * @returns {Array} - Detected intents
 */
const detectIntents = (text) => {
  const intents = [];
  
  const intentPatterns = {
    workout: /workout|exercise|gym|fitness|training|run|running|jog/i,
    diet: /diet|food|meal|nutrition|calories|eat|breakfast|lunch|dinner/i,
    reminder: /remind|reminder|alert|notify|schedule|appointment/i,
    shopping: /shop|buy|purchase|order|grocery|groceries/i,
    wishlist: /wish|want|desire|like to have|save for later/i,
    steps: /steps|walk|walking|distance|pedometer/i,
    analytics: /analytics|stats|statistics|report|summary|progress/i
  };
  
  for (const [intent, pattern] of Object.entries(intentPatterns)) {
    if (pattern.test(text)) {
      intents.push(intent);
    }
  }
  
  return intents;
};

/**
 * Validate audio format for Whisper
 * @param {string} mimeType - Audio MIME type
 * @returns {boolean} - Is valid format
 */
export const isValidAudioFormat = (mimeType) => {
  // Whisper supports: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
  const validFormats = [
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/mpga',
    'audio/webm',
    'audio/ogg',
    'audio/flac',
    'audio/m4a',
    'audio/mp4',
    'audio/x-m4a'
  ];
  return validFormats.includes(mimeType.toLowerCase());
};

/**
 * Get supported audio formats
 * @returns {Array} - List of supported formats
 */
export const getSupportedFormats = () => {
  return ['flac', 'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'ogg', 'wav', 'webm'];
};

export default {
  transcribeAudio,
  transcribeFromFile,
  transcribeForISHA,
  isValidAudioFormat,
  getSupportedFormats
};
