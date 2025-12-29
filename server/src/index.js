import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./configs/dbConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import workoutRoutes from "./routes/workoutRoutes.js";
import dietRoutes from "./routes/dietRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import foodRecipeRoutes from "./routes/foodRecipeRoutes.js";
import stepsRoutes from "./routes/stepsRoutes.js";
import bodyMeasurementsRoutes from "./routes/bodyMeasurementsRoutes.js";
import shoppingListRoutes from "./routes/shoppingListRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import notesRoutes from "./routes/notesRoutes.js";
import booksRoutes from "./routes/booksRoutes.js";
import animeRoutes from "./routes/animeRoutes.js";
import expensesRoutes from "./routes/expensesRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Get local IP addresses for debugging
const getLocalIPs = () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }
  return addresses;
};

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 [${timestamp}] ${req.method} ${req.url} - IP: ${req.ip}`);

  // Log request body for POST/PUT requests (excluding sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    console.log(`   📦 Body:`, JSON.stringify(req.body).substring(0, 200));
  }

  // Log response
  const originalSend = res.send;
  res.send = function (data) {
    console.log(`📤 [${timestamp}] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    return originalSend.apply(res, arguments);
  };

  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`❌ [ERROR] ${req.method} ${req.url}:`, err.message);
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
  });
});

// API Routes
app.use("/api/workouts", workoutRoutes);
app.use("/api/diets", dietRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/food-recipes", foodRecipeRoutes);
app.use("/api/steps", stepsRoutes);
app.use("/api/measurements", bodyMeasurementsRoutes);
app.use("/api/shopping-list", shoppingListRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/anime", animeRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api", aiRoutes);  // AI chat routes

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check endpoints (for Docker and monitoring)
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is running" });
});

// Connect to database and start server
const startServer = async () => {
  await connectDB();

  // Listen on all network interfaces (0.0.0.0) for mobile access
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server is running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);

    const ips = getLocalIPs();
    if (ips.length > 0) {
      console.log(`📱 Network access URLs:`);
      ips.forEach(({ name, address }) => {
        console.log(`   - http://${address}:${PORT} (${name})`);
      });
      console.log(`\n💡 Make sure your mobile app API_URL matches one of these addresses!\n`);
    }
  });
};

startServer();