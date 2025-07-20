import express from "express";
import Ticket from "../models/Ticket.js";
import crypto from "crypto";

const router = express.Router();

// ✅ Helper: generate expected hash
function generateTicketHash(ticketId, email) {
  const secretKey = process.env.QR_SECRET || "super-secret-key";
  return crypto.createHmac("sha256", secretKey).update(ticketId + email).digest("hex");
}

/**
 * ✅ 1. Validate ticket at Gate Entry
 */
router.post("/validate", async (req, res) => {
  try {
    const { ticketId, hash } = req.body;

    const ticket = await Ticket.findById(ticketId);

    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({
        success: false,
        message: "❌ Invalid or unpaid ticket!"
      });
    }

    // ✅ Check if hash matches
    const expectedHash = generateTicketHash(ticket._id.toString(), ticket.buyerEmail);
    if (hash !== expectedHash) {
      return res.status(403).json({
        success: false,
        message: "❌ Security check failed! QR tampered."
      });
    }

    // ✅ Prevent double check-in
    if (ticket.checkedIn) {
      return res.status(409).json({
        success: false,
        message: "⚠️ Ticket already checked in!"
      });
    }

    // ✅ Mark as checked in
    ticket.checkedIn = true;
    await ticket.save();

    return res.json({
      success: true,
      message: "✅ Ticket valid! Welcome to KAT-2 Festival 🎉",
      ticketInfo: {
        buyerEmail: ticket.buyerEmail,
        ticketType: ticket.ticketType,
        quantity: ticket.quantity,
        checkedIn: true,
        servicesUsed: ticket.servicesUsed || {}
      }
    });

  } catch (err) {
    console.error("❌ Ticket Validation Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during validation."
    });
  }
});

/**
 * ✅ 2. Validate & Redeem Specific Service (food, drink, store)
 * body: { ticketId, hash, serviceType }
 */
router.post("/service", async (req, res) => {
  try {
    const { ticketId, hash, serviceType } = req.body;

    // Only allow predefined service types
    if (!["food", "drink", "store"].includes(serviceType)) {
      return res.status(400).json({ success: false, message: "❌ Invalid service type!" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Ticket not valid or unpaid!" });
    }

    // ✅ Validate QR hash
    const expectedHash = generateTicketHash(ticket._id.toString(), ticket.buyerEmail);
    if (hash !== expectedHash) {
      return res.status(403).json({ success: false, message: "❌ QR tampered or invalid!" });
    }

    // ✅ Ensure user checked in at the gate first
    if (!ticket.checkedIn) {
      return res.status(409).json({
        success: false,
        message: "⚠️ Must check-in at GATE first before redeeming services!"
      });
    }

    // ✅ Check if service already redeemed
    if (ticket.servicesUsed && ticket.servicesUsed[serviceType]) {
      return res.status(409).json({
        success: false,
        message: `⚠️ ${serviceType.toUpperCase()} service already redeemed!`
      });
    }

    // ✅ Mark service as redeemed
    if (!ticket.servicesUsed) ticket.servicesUsed = {};
    ticket.servicesUsed[serviceType] = true;
    await ticket.save();

    return res.json({
      success: true,
      message: `✅ ${serviceType.toUpperCase()} service redeemed successfully!`,
      ticketInfo: {
        buyerEmail: ticket.buyerEmail,
        ticketType: ticket.ticketType,
        servicesUsed: ticket.servicesUsed
      }
    });

  } catch (err) {
    console.error("❌ Service Validation Error:", err);
    res.status(500).json({ success: false, message: "Server error during service validation" });
  }
});

export default router;
