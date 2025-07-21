/* eslint-env node */
import express from "express";
import Ticket from "../models/Ticket.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin-secret-token";

/**
 * ✅ NEW: Activity Log (mỗi user = 1 dòng)
 * GET /api/admin/activity-log
 */
router.get("/activity-log", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // ✅ Lấy toàn bộ ticket
  const tickets = await Ticket.find().lean();

  // ✅ Build log
  const logs = tickets.map((t) => ({
    email: t.buyerEmail,
    ticketType: t.ticketType?.toUpperCase(),
    checkedInAt: t.checkedInAt
      ? new Date(t.checkedInAt).toLocaleString("en-GB")
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
