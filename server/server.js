import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Prisma Client
import { prisma } from "./utils/prismaClient.js";

// ✅ Import API routes (đã refactor Prisma)
import ticketRoutes from "./routes/ticketRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import checkinRoutes from "./routes/checkinRoutes.js";
import serviceRedeemRoutes from "./routes/serviceRedeemRoutes.js";
import activityLogRoutes from "./routes/activityLogRoutes.js";

// ✅ Import Cron Job
import "./cron/expirePendingTickets.js";

// ✅ Resolve __dirname cho ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load .env đúng trong server/
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

// ✅ Test kết nối Prisma DB khi start (MongoDB version)
async function testPrismaConnection() {
  try {
    await prisma.ticket.findFirst(); // simple query to test connection
    console.log("✅ Prisma connected to MongoDB successfully!");
  } catch (err) {
    console.error("❌ Prisma DB connection error:", err);
  }
}
testPrismaConnection();

// ✅ Mở full CORS để tránh lỗi frontend gọi API
app.use(cors({ origin: "*" }));
app.use(express.json());

// =========================================
// ✅ API ROUTES - load TRƯỚC static
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
