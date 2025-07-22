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

dotenv.config();
const app = express();

// ✅ Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

app.use(cors({ origin: "*" }));
app.use(express.json());

// ✅ API routes
app.use("/api/tickets", ticketRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/service-redeem", serviceRedeemRoutes);
app.use("/api/admin", activityLogRoutes);

// ✅ Serve FE build
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "../dist");

app.use(express.static(distPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
