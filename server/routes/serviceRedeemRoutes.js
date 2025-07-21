import express from "express";
import Ticket from "../models/Ticket.js";
import Log from "../models/Log.js";
import { appendLog } from "./adminRoutes.js";

const router = express.Router();

/**
 * ✅ Manual Service Redeem (no QR)
 */
router.post("/manual-service", async (req, res) => {
  try {
    const { ticketId, serviceType } = req.body;
    if (!["food", "drink", "store"].includes(serviceType)) {
      return res.status(400).json({ success: false, message: "❌ Invalid service type!" });
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Ticket not valid or unpaid!" });
    }

    if (!ticket.checkedIn) {
      return res.status(409).json({
        success: false,
        message: "⚠️ Must check-in at gate first before redeeming any service!",
      });
    }

    if (!ticket.servicesUsed) {
      ticket.servicesUsed = { food: false, drink: false, store: false };
    }

    if (ticket.servicesUsed[serviceType]) {
      return res.status(409).json({
        success: false,
        message: `⚠️ ${serviceType.toUpperCase()} already redeemed!`,
      });
    }

    ticket.servicesUsed[serviceType] = true;
    ticket.markModified("servicesUsed");
    await ticket.save();

    // ✅ Ghi log với thời gian
    appendLog(`🍔 SERVICE REDEEM - ${serviceType.toUpperCase()}`, ticket.buyerEmail, "Staff");

    return res.json({
      success: true,
      message: `✅ ${serviceType.toUpperCase()} service redeemed successfully!`,
      ticketInfo: ticket,
    });
  } catch (err) {
    console.error("❌ Manual Service Redeem Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during service redeem",
    });
  }
});

export default router;
