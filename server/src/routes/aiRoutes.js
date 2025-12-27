import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { handleChat, checkHealth, transcribeAudio } from '../controllers/aiController.js';

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.wav';
    cb(null, 'audio-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    // Accept audio files (wav, m4a, mp3, etc.)
    const allowedTypes = ['audio/wav', 'audio/wave', 'audio/x-wav', 'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/mp3'];
    if (file.mimetype.startsWith('audio/') || allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

/**
 * POST /api/chat
 * Main chat endpoint for AI conversations
 * Body: { message: string, conversationHistory?: array }
 */
router.post('/chat', handleChat);

/**
 * GET /api/chat/health
 * Health check for AI service (Ollama connection)
 */
router.get('/chat/health', checkHealth);

/**
 * POST /api/chat/transcribe
 * Transcribe audio to text using Whisper
 */
router.post('/chat/transcribe', upload.single('audio'), transcribeAudio);

export default router;
