import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import ticketRoutes from "./routes/ticketRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import checkinRoutes from "./routes/checkinRoutes.js";
import serviceRedeemRoutes from "./routes/serviceRedeemRoutes.js";
import activityLogRoutes from "./routes/activityLogRoutes.js";

dotenv.config();
const app = express();

// ✅ Kết nối MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ CORS cho Vercel + Local
const allowedOrigins = [
  "http://localhost:5173",         // local Vite dev
  "https://kat-psi.vercel.app"     // deployed frontend
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked CORS for origin:", origin);
      callback(new Error("CORS not allowed for this origin"));
    }
  },
  credentials: true
}));

// ✅ JSON body
app.use(express.json());

// ✅ API routes
app.use("/api/tickets", ticketRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/service-redeem", serviceRedeemRoutes);
app.use("/api/admin", activityLogRoutes);

// ✅ Health check
app.get('/', (req, res) => {
  res.json({ message: '✅ Backend KAT-2 is running with MongoDB!' });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
