// server/seedStock.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import TicketStock from "./models/TicketStock.js";

// ✅ Lấy đúng đường dẫn .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

// ✅ Kết nối MongoDB
console.log("🔄 Connecting to MongoDB...");
await mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected!"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

// ✅ Dữ liệu mặc định cho stock
const defaultStocks = [
  { ticketType: "standard", total: 100, remaining: 100, price: 500000 },
  { ticketType: "vip", total: 50, remaining: 50, price: 1000000 },
  { ticketType: "vvip", total: 10, remaining: 10, price: 2500000 },
];

for (const s of defaultStocks) {
  const exists = await TicketStock.findOne({ ticketType: s.ticketType });
  if (!exists) {
    await TicketStock.create(s);
    console.log(`✅ Seeded stock: ${s.ticketType.toUpperCase()} (${s.total} tickets)`);
  } else {
    console.log(`⚠️ Stock already exists for ${s.ticketType.toUpperCase()}, skipping...`);
  }
}

console.log("🎉 Seeding completed!");
mongoose.disconnect();
