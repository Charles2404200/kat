import mongoose from "mongoose";

const TicketStockSchema = new mongoose.Schema({
  ticketType: { type: String, required: true, unique: true }, // standard/vip/vvip
  total: { type: Number, required: true },       // tổng số vé cấu hình
  remaining: { type: Number, required: true },   // số vé còn lại
  price: { type: Number, required: true },       // giá vé
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Tự update `updatedAt` mỗi khi save
TicketStockSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("TicketStock", TicketStockSchema);
