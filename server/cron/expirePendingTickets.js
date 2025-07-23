import cron from "node-cron";
import Ticket from "../models/Ticket.js";
import TicketStock from "../models/TicketStock.js";
import { appendLog } from "../routes/adminRoutes.js";

// Lấy thời gian hết hạn từ ENV, mặc định 15 phút
const EXPIRE_MINUTES = parseInt(process.env.PENDING_TICKET_EXPIRE_MINUTES || "1", 10) * 60 * 1000;

console.log(`⏳ Pending tickets will auto-delete after ${EXPIRE_MINUTES / 60000} minutes`);

cron.schedule("* * * * *", async () => {
  try {
    console.log("⏳ Running pending ticket cleanup job...");

    const now = Date.now();

    // Tìm các vé pending quá hạn
    const expiredTickets = await Ticket.find({
      status: "pending",
      createdAt: { $lte: new Date(now - EXPIRE_MINUTES) }
    });

    if (!expiredTickets.length) {
      console.log("✅ No expired tickets found.");
      return;
    }

    console.log(`⏳ Found ${expiredTickets.length} expired tickets, deleting...`);

    for (const ticket of expiredTickets) {
      // ✅ Hoàn lại stock
      const stock = await TicketStock.findOne({ ticketType: ticket.ticketType });
      if (stock) {
        stock.remaining += ticket.quantity;
        await stock.save();
      }

      // ✅ Ghi log trước khi xoá
      appendLog(`🗑 Auto-deleted expired ticket`, ticket.buyerEmail, "System");
    }

    // ✅ Xoá tất cả vé pending đã hết hạn
    const idsToDelete = expiredTickets.map(t => t._id);
    await Ticket.deleteMany({ _id: { $in: idsToDelete } });

    console.log(`✅ Deleted ${expiredTickets.length} expired tickets`);
  } catch (err) {
    console.error("❌ Cron job error:", err);
  }
});
