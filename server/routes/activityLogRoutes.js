import { Router } from "express";
import { prisma } from "../utils/prismaClient.js"; // Prisma client
import dotenv from "dotenv";

dotenv.config();
const router = Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin-secret-token";

router.get("/activity-log", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // ✅ Lấy toàn bộ ticket từ Prisma
  const tickets = await prisma.ticket.findMany();

  const logs = tickets.map((t) => ({
    email: t.buyerEmail,
    ticketType: t.ticketType?.toUpperCase(),
    checkedInAt: t.checkedIn
      ? new Date(t.createdAt).toLocaleString("en-GB")
      : null,
    foodAt: t.servicesUsed?.foodAt
      ? new Date(t.servicesUsed.foodAt).toLocaleString("en-GB")
      : null,
    drinkAt: t.servicesUsed?.drinkAt
      ? new Date(t.servicesUsed.drinkAt).toLocaleString("en-GB")
      : null,
    storeAt: t.servicesUsed?.storeAt
      ? new Date(t.servicesUsed.storeAt).toLocaleString("en-GB")
      : null,
  }));

  return res.json({ success: true, logs });
});

export default router;
