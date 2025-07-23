import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import TicketStock from "./models/TicketStock.js";

// ✅ Lấy đúng đường dẫn .env trong thư mục server/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

// ✅ Kết nối MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

// ✅ Seed data
const seedTicketStock = async () => {
  await connectDB();

  // Xóa stock cũ nếu có
  await TicketStock.deleteMany();

  // Thêm dữ liệu mới
  const stocks = [
    { ticketType: "standard", total: 100, remaining: 100, price: 500000 },
    { ticketType: "vip", total: 50, remaining: 50, price: 1000000 },
    { ticketType: "vvip", total: 10, remaining: 10, price: 2500000 }
  ];

  await TicketStock.insertMany(stocks);

  console.log("✅ TicketStock seeded successfully!");
  mongoose.connection.close(); // Đóng kết nối sau khi xong
};

seedTicketStock();
