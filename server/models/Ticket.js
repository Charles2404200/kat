import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
  buyerEmail: String,
  ticketType: String,
  quantity: Number,
  totalPrice: Number,
  status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
  qrCodeUrl: String,
  ticketHash: String,
  checkedIn: { type: Boolean, default: false }, // entrance check-in
  servicesUsed: {   // ✅ Track which services are used
    type: Object,
    default: {
      food: false,
      drink: false,
      store: false
    }
  },
  createdAt: { type: Date, default: Date.now }
});


export default mongoose.model("Ticket", TicketSchema);
