import mongoose from "mongoose";

const LogSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
  buyerEmail: String,
  action: String, // "gate-checkin", "redeem-food", "redeem-drink", "redeem-store"
  staff: { type: String, default: "system" }, // optional, nếu muốn sau này gán nhân viên
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("Log", LogSchema);
