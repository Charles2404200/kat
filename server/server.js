import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Import API routes
import ticketRoutes from "./routes/ticketRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import checkinRoutes from "./routes/checkinRoutes.js";
import serviceRedeemRoutes from "./routes/serviceRedeemRoutes.js";
import activityLogRoutes from "./routes/activityLogRoutes.js";
import "./cron/expirePendingTickets.js"; // Cron job

// ✅ Resolve __dirname cho ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load .env đúng trong server/
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

// ✅ Kết nối MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Mở full CORS để tránh lỗi frontend gọi API
app.use(cors({ origin: "*" }));
app.use(express.json());

// =========================================
// ✅ API ROUTES - luôn load TRƯỚC static
// =========================================
app.use("/api/tickets", ticketRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/service-redeem", serviceRedeemRoutes);
app.use("/api/admin", activityLogRoutes);

// ✅ Debug log tất cả request API
app.use("/api/*", (req, res, next) => {
  console.log(`📡 [API REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// =========================================
// ✅ SERVE FRONTEND VITE BUILD
// =========================================
const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

// ✅ Fallback: chỉ trả SPA nếu không phải API
app.get("*", (req, res) => {
  if (req.originalUrl.startsWith("/api/")) {
    console.warn(`⚠️ API not found: ${req.originalUrl}`);
    return res.status(404).json({ success: false, error: "API not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});

// =========================================
// ✅ Start server
// =========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
