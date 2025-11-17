import dotenv from "dotenv";
import express from "express";
import axios from "axios";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import compression from "compression";

// Import local modules dengan ekstensi .js
import errorHandler from "./src/middleware/errorHandler.js";
import { sequelize, testConnection } from "./src/config/database.js";

// Import routes
import authRoutes from "./src/routes/auth.js";
import habitRoutes from "./src/routes/habit.js";

dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
})); // Biar bisa dipanggil dari frontend Next.js

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});
app.use("/api/", apiLimiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

const isTesting = process.env.USE_DUMMY === "true";

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);

// 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({ error: "Endpoint not found", path: req.originalUrl });
// });

// Endpoint AI
app.post("/api/ai", async (req, res) => {
  const { prompt } = req.body;

  if (isTesting) {
    // Dummy response for testing purposes
    const dummyResponse = [
      // { "response": "Karena kamu ingin cepat jago coding, saya buat jadwal ini fokus pada kombinasi 'belajar konsep', 'latihan coding', dan 'praktek langsung bikin project'. Saya selipkan sesi santai seperti baca artikel, diskusi di komunitas, atau nonton video agar belajar tetap fun dan nggak monoton. Intinya, semakin sering kamu ngoding dan nyoba bikin sesuatu, skill kamu akan berkembang lebih cepat." },
      { "id": "task-0600", "time": "06:00", "title": "Bangun dan stretching 10 menit", "durationMinutes": 30 },
      { "id": "task-0615", "time": "06:15", "title": "Olahraga ringan (jogging atau bodyweight workout)", "durationMinutes": 30 },
      { "id": "task-0700", "time": "07:00", "title": "Mandi dan bersiap-siap", "durationMinutes": 30 },
    ];
    console.log("Using dummy response:", dummyResponse);
    // Simulasi delay 1.5 detik
    setTimeout(() => {
      res.json(dummyResponse);
    }, 1500);

    return;
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Kamu adalah asisten produktivitas.
              Tugasmu hanya menjawab dalam bentuk array JSON yang berisi jadwal produktif harian.
              Jangan pernah menambahkan penjelasan tambahan.`,
          },
          {
            role: "user",
            content:
              prompt +
              `Format jawaban HARUS dalam bentuk array JSON, dengan setiap item memiliki properti:
              - "time": waktu dalam format 24 jam (contoh: "08:00")
              - "activity": deskripsi singkat kegiatan yang produktif

              Contoh format:
              [
                { "time": "08:00", "activity": "Bangun dan olahraga ringan" },
                { "time": "09:00", "activity": "Sarapan sehat dan rencana hari" }
              ]

              Note: Jangan tambahkan penjelasan apapun sebelum atau sesudah JSON.
              Hanya kirimkan JSON array saja.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponse = JSON.parse(response.data.choices[0].message.content);
    res.json({ result: aiResponse });
  } catch (error) {
    console.error("OpenAI API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Something went wrong with AI API." });
  }
});

// Error handling middleware
app.use(errorHandler);

// Start the server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync database models (dev only)
    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: true });
      console.log("✅ Database synchronized");
    }

    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api/`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Promise Rejection:", error);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1); // Exit the process to avoid unknown state
});

// Handle SIGTERM for graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

await startServer();

export default app;