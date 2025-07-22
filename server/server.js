import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import ticketRoutes from "./routes/ticketRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import checkinRoutes from "./routes/checkinRoutes.js";
import serviceRedeemRoutes from "./routes/serviceRedeemRoutes.js";
import activityLogRoutes from "./routes/activityLogRoutes.js";

dotenv.config();
const app = express();

// ✅ Kết nối MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Mở full CORS (cho phép tất cả origin để tránh lỗi CORS khi deploy)
app.use(cors({ origin: "*" }));

// ✅ Cho phép Express parse JSON body
app.use(express.json());

// ✅ Định nghĩa API routes
app.use("/api/tickets", ticketRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/service-redeem", serviceRedeemRoutes);
app.use("/api/admin", activityLogRoutes);

// ✅ Health check route
app.get("/", (req, res) => {
  res.json({ message: "✅ Backend KAT-2 is running with MongoDB!" });
});

// ✅ Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
