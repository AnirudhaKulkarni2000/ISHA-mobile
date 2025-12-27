import express from 'express';
import multer from 'multer';
import {
  uploadProgress,
  uploadProgressBase64,
  getAll,
  getById,
  remove,
  getStats,
  getByDateRange,
  initTable,
  upload
} from '../controllers/progressController.js';

const router = express.Router();

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  console.log('📁 ========== MULTER PROCESSING ==========');
  if (err instanceof multer.MulterError) {
    console.error('❌ Multer Error:', err.code, err.message);
    return res.status(400).json({
      message: 'File upload error',
      error: err.message,
      code: err.code
    });
  } else if (err) {
    console.error('❌ Upload Error:', err.message);
    return res.status(400).json({
      message: 'Upload error',
      error: err.message
    });
  }
  console.log('📁 File received successfully');
  next();
};

// Initialize table
router.post('/init', initTable);

// Upload progress image - with error handling
router.post('/upload', (req, res, next) => {
  console.log('\n📥 ========== UPLOAD ROUTE HIT ==========');
  console.log('📥 Content-Type:', req.headers['content-type']);
  console.log('📥 Content-Length:', req.headers['content-length']);
  next();
}, upload.single('image'), handleMulterError, uploadProgress);

// Upload progress image via base64 (for Expo Go compatibility)
router.post('/upload-base64', uploadProgressBase64);

// Get all progress entries
router.get('/', getAll);

// Get progress stats
router.get('/stats', getStats);

// Get progress by date range
router.get('/range', getByDateRange);

// Get single progress entry
router.get('/:id', getById);

// Delete progress entry
router.delete('/:id', remove);

export default router;
