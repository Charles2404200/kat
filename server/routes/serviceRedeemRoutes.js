import express from "express";
import Ticket from "../models/Ticket.js";

const router = express.Router();

/**
 * ✅ Manual Service Redeem
 * body: { ticketId, serviceType }
 */
router.post("/manual-service", async (req, res) => {
  try {
    const { ticketId, serviceType } = req.body;

    // ✅ Validate service type
    if (!["food", "drink", "store"].includes(serviceType)) {
      return res.status(400).json({ success: false, message: "❌ Invalid service type!" });
    }

    const ticket = await Ticket.findById(ticketId);

    // ✅ Ticket must exist & be paid
    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Ticket not valid or unpaid!" });
    }

    // ✅ Must have been gate checked-in first
    if (!ticket.checkedIn) {
      return res.status(409).json({
        success: false,
        message: "⚠️ Must check-in at gate first before redeeming any service!",
      });
    }

    // ✅ Init servicesUsed if missing
    if (!ticket.servicesUsed) {
      ticket.servicesUsed = { food: false, drink: false, store: false };
    }

    // ✅ Prevent double redeem
    if (ticket.servicesUsed[serviceType]) {
      return res.status(409).json({
        success: false,
        message: `⚠️ ${serviceType.toUpperCase()} already redeemed!`,
      });
    }

    // ✅ Redeem this service
    ticket.servicesUsed[serviceType] = true;
    ticket.markModified("servicesUsed"); // ensure mongoose detects nested change
    await ticket.save();

    console.log(`✅ ${serviceType.toUpperCase()} redeemed for ticket:`, ticket._id);

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
