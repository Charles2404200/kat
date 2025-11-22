import cron from "node-cron";
import { prisma } from "../utils/prismaClient.js";
import { appendLog } from "../routes/adminRoutes.js";

// Lấy thời gian hết hạn từ ENV, mặc định 15 phút
const EXPIRE_MINUTES = parseInt(process.env.PENDING_TICKET_EXPIRE_MINUTES || "1", 10) * 60 * 1000;

console.log(` Pending tickets will auto-delete after ${EXPIRE_MINUTES / 60000} minutes`);

cron.schedule("* * * * *", async () => {
  try {
    console.log(" Running pending ticket cleanup job...");

    const now = new Date();
    const expiredBefore = new Date(now.getTime() - EXPIRE_MINUTES);

    //  Tìm các vé pending quá hạn
    const expiredTickets = await prisma.ticket.findMany({
      where: {
        status: "pending",
        createdAt: { lt: expiredBefore }
      }
    });

    if (!expiredTickets.length) {
      console.log(" No expired tickets found.");
      return;
    }

    console.log(` Found ${expiredTickets.length} expired tickets, deleting...`);

    //  Lặp qua từng ticket để hoàn lại stock
    for (const ticket of expiredTickets) {
      const stock = await prisma.ticketStock.findUnique({
        where: { ticketType: ticket.ticketType }
      });

      if (stock) {
        //  Tăng lại remaining
        await prisma.ticketStock.update({
          where: { ticketType: ticket.ticketType },
          data: {
            remaining: stock.remaining + ticket.quantity
          }
        });
      }

      //  Ghi log trước khi xoá
      appendLog(`🗑 Auto-deleted expired ticket`, ticket.buyerEmail, "System");
    }

    //  Xóa tất cả vé pending đã hết hạn
    const idsToDelete = expiredTickets.map((t) => t.id);
    await prisma.ticket.deleteMany({
      where: { id: { in: idsToDelete } }
    });

    console.log(` Deleted ${expiredTickets.length} expired tickets`);
  } catch (err) {
    console.error(" Cron job error:", err);
  }
});
