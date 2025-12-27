import progressModel from '../models/progressModel.js';
import { google } from 'googleapis';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for temporary file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(file.originalname);
    cb(null, `progress_${timestamp}${ext}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Google Drive API setup
const getGoogleDriveClient = () => {
  const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log('🔑 GOOGLE_APPLICATION_CREDENTIALS:', keyFilePath);

  if (!keyFilePath) {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS env variable not set');
    return null;
  }

  // Resolve the path relative to the server root
  const resolvedPath = path.resolve(__dirname, '../../', keyFilePath.replace('./', ''));
  console.log('🔑 Resolved key file path:', resolvedPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error('❌ Google Drive credentials file not found at:', resolvedPath);
    console.error('   Current directory:', __dirname);
    return null;
  }

  console.log('✅ Google credentials file found');

  const auth = new google.auth.GoogleAuth({
    keyFile: resolvedPath,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });

  return google.drive({ version: 'v3', auth });
};

// Upload file to Google Drive and return the view URL
const uploadToGoogleDrive = async (filePath, fileName, mimeType) => {
  const drive = getGoogleDriveClient();

  if (!drive) {
    throw new Error('Google Drive not configured. Please set GOOGLE_APPLICATION_CREDENTIALS.');
  }

  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    console.log('📂 GOOGLE_DRIVE_FOLDER_ID:', folderId);

    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID is required for service account uploads. Please set it in .env file.');
    }

    const fileMetadata = {
      name: fileName,
      parents: [folderId]  // Always use folder ID for service account uploads
    };

    console.log('📂 File metadata:', JSON.stringify(fileMetadata));

    const media = {
      mimeType,
      body: fs.createReadStream(filePath)
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
      supportsAllDrives: true  // Required for shared folders
    });

    // Make the file publicly viewable
    await drive.permissions.create({
      fileId: response.data.id,
      resource: {
        role: 'reader',
        type: 'anyone'
      },
      supportsAllDrives: true  // Required for shared folders
    });

    // Get direct image URL
    const directUrl = `https://drive.google.com/uc?export=view&id=${response.data.id}`;

    console.log('✅ File uploaded to Google Drive:', response.data.id);
    return {
      fileId: response.data.id,
      imageUrl: directUrl,
      viewLink: response.data.webViewLink
    };
  } catch (error) {
    console.error('❌ Google Drive upload error:', error.message);
    throw error;
  }
};

// Delete file from Google Drive using URL
const deleteFromGoogleDrive = async (imageUrl) => {
  const drive = getGoogleDriveClient();

  if (!drive || !imageUrl) {
    return false;
  }

  try {
    // Extract file ID from URL
    const match = imageUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (!match) return false;

    const fileId = match[1];
    await drive.files.delete({ fileId });
    console.log('✅ File deleted from Google Drive:', fileId);
    return true;
  } catch (error) {
    console.error('❌ Google Drive delete error:', error.message);
    return false;
  }
};

// Initialize table
export const initTable = async (req, res) => {
  try {
    await progressModel.createProgressTable();
    res.status(200).json({ message: 'Progress table initialized' });
  } catch (error) {
    res.status(500).json({ message: 'Error initializing table', error: error.message });
  }
};

// Upload progress image
export const uploadProgress = async (req, res) => {
  console.log('\n📤 ========== UPLOAD PROGRESS REQUEST ==========');
  console.log('📤 Request body:', req.body);
  console.log('📤 Request file:', req.file ? { filename: req.file.filename, path: req.file.path, mimetype: req.file.mimetype, size: req.file.size } : 'No file');

  try {
    if (!req.file) {
      console.error('❌ No image file in request');
      return res.status(400).json({ message: 'No image file provided' });
    }

    const capturedAt = req.body.captured_at || new Date().toISOString();
    const dateTime = new Date(capturedAt);

    // Format filename with date and time
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[dateTime.getDay()];
    const formattedDate = dateTime.toISOString().split('T')[0];
    const formattedTime = dateTime.toTimeString().split(' ')[0].replace(/:/g, '-');
    const driveFileName = `Progress_${formattedDate}_${dayName}_${formattedTime}${path.extname(req.file.originalname)}`;

    console.log('📤 Drive file name:', driveFileName);
    console.log('📤 Uploading to Google Drive...');

    // Upload to Google Drive
    const googleDriveData = await uploadToGoogleDrive(
      req.file.path,
      driveFileName,
      req.file.mimetype
    );

    console.log('✅ Google Drive upload successful:', googleDriveData);

    // Delete temporary local file after upload
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('🗑️ Temporary file deleted');
    }

    // Save to database (only URL, timestamp, and day)
    const entryData = {
      image_url: googleDriveData.imageUrl,
      captured_at: capturedAt
    };

    console.log('💾 Saving to database:', entryData);

    const entry = await progressModel.createProgressEntry(entryData);

    console.log('✅ Database entry created:', entry);
    console.log('📤 ========== UPLOAD COMPLETE ==========\n');

    res.status(201).json({
      message: 'Progress image uploaded to Google Drive',
      data: entry
    });
  } catch (error) {
    console.error('\n❌ ========== UPLOAD ERROR ==========');
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ =====================================\n');

    // Clean up temporary file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error uploading progress', error: error.message });
  }
};

// Upload progress image from base64 (for Expo Go compatibility)
// Uses LOCAL storage since Google Drive service accounts don't work with personal accounts
export const uploadProgressBase64 = async (req, res) => {
  console.log('\n📤 ========== BASE64 UPLOAD REQUEST ==========');
  console.log('📤 Request body keys:', Object.keys(req.body));
  console.log('📤 Has image:', !!req.body.image);
  console.log('📤 Image length:', req.body.image?.length || 0);

  try {
    const { image, mimeType, captured_at } = req.body;

    if (!image) {
      console.error('❌ No base64 image data provided');
      return res.status(400).json({ message: 'No image data provided' });
    }

    // Create file from base64
    const buffer = Buffer.from(image, 'base64');
    const ext = mimeType === 'image/png' ? '.png' : '.jpeg';

    const capturedAt = captured_at || new Date().toISOString();
    const dateTime = new Date(capturedAt);

    // Format filename with date and time
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[dateTime.getDay()];
    const formattedDate = dateTime.toISOString().split('T')[0];
    const formattedTime = dateTime.toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `Progress_${formattedDate}_${dayName}_${formattedTime}${ext}`;

    // Save to local storage (progress folder)
    const progressDir = path.join(__dirname, '../../uploads/progress');
    if (!fs.existsSync(progressDir)) {
      fs.mkdirSync(progressDir, { recursive: true });
    }

    const filePath = path.join(progressDir, fileName);
    fs.writeFileSync(filePath, buffer);
    console.log('📁 File saved locally:', filePath);

    // Generate URL for accessing the image (served as static file)
    const imageUrl = `/uploads/progress/${fileName}`;
    console.log('🔗 Image URL:', imageUrl);

    // Save to database
    const entryData = {
      image_url: imageUrl,
      captured_at: capturedAt
    };

    console.log('💾 Saving to database:', entryData);

    const entry = await progressModel.createProgressEntry(entryData);

    console.log('✅ Database entry created:', entry);
    console.log('📤 ========== LOCAL UPLOAD COMPLETE ==========\n');

    res.status(201).json({
      message: 'Progress image uploaded successfully',
      data: entry
    });
  } catch (error) {
    console.error('\n❌ ========== BASE64 UPLOAD ERROR ==========');
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ =========================================\n');

    res.status(500).json({ message: 'Error uploading progress', error: error.message });
  }
};

// Get all progress entries
export const getAll = async (req, res) => {
  try {
    const entries = await progressModel.getAllProgressEntries();
    res.status(200).json({ data: entries });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching progress entries', error: error.message });
  }
};

// Get progress by date range
export const getByDateRange = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'start_date and end_date are required' });
    }
    const entries = await progressModel.getProgressByDateRange(start_date, end_date);
    res.status(200).json({ data: entries });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching progress entries', error: error.message });
  }
};

// Get progress by ID
export const getById = async (req, res) => {
  try {
    const entry = await progressModel.getProgressEntryById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Progress entry not found' });
    }
    res.status(200).json({ data: entry });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching progress entry', error: error.message });
  }
};

// Get progress stats
export const getStats = async (req, res) => {
  try {
    const stats = await progressModel.getProgressStats();
    res.status(200).json({ data: stats });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};

// Delete progress entry
export const remove = async (req, res) => {
  try {
    const entry = await progressModel.getProgressEntryById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Progress entry not found' });
    }

    // Delete from Google Drive
    await deleteFromGoogleDrive(entry.image_url);

    const deleted = await progressModel.deleteProgressEntry(req.params.id);
    res.status(200).json({ message: 'Progress entry deleted', data: deleted });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting progress entry', error: error.message });
  }
};
