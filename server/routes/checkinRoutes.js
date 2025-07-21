import express from "express";
import Ticket from "../models/Ticket.js";
import crypto from "crypto";
import Log from "../models/Log.js";

const router = express.Router();

// ✅ Helper: generate expected hash
function generateTicketHash(ticketId, email) {
  const secretKey = process.env.QR_SECRET || "super-secret-key";
  return crypto.createHmac("sha256", secretKey).update(ticketId + email).digest("hex");
}

/**
 * ✅ 1. Validate QR ONLY (no DB change)
 */
router.post("/validate", async (req, res) => {
  try {
    const { ticketId, hash } = req.body;
    const ticket = await Ticket.findById(ticketId);

    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Invalid or unpaid ticket!" });
    }

    // ✅ Verify hash
    const expectedHash = generateTicketHash(ticket._id.toString(), ticket.buyerEmail);
    if (hash !== expectedHash) {
      return res.status(403).json({ success: false, message: "❌ Security check failed! QR tampered." });
    }

    // ✅ Just validate, don’t mark checkedIn
    return res.json({
      success: true,
      message: ticket.checkedIn
        ? "⚠️ Ticket already checked in!"
        : "✅ Ticket valid, ready for manual confirmation.",
      ticketInfo: {
        id: ticket._id,
        buyerEmail: ticket.buyerEmail,
        ticketType: ticket.ticketType,
        quantity: ticket.quantity,
        checkedIn: ticket.checkedIn,
        servicesUsed: ticket.servicesUsed || {},
      }
    });
  } catch (err) {
    console.error("❌ Ticket Validation Error:", err);
    res.status(500).json({ success: false, message: "Server error during validation." });
  }
});

/**
 * ✅ 2. Manual Gate Check-In (actually mark checkedIn)
 */
router.post("/manual-gate", async (req, res) => {
  try {
    const { ticketId } = req.body;
    const ticket = await Ticket.findById(ticketId);

    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Invalid or unpaid ticket!" });
    }

    if (ticket.checkedIn) {
      return res.status(409).json({ success: false, message: "⚠️ Ticket already checked in!" });
    }

    // ✅ Mark checkedIn
    ticket.checkedIn = true;
    await ticket.save();

    return res.json({
      success: true,
      message: "✅ Gate Check-In Successful!",
      ticketInfo: {
        buyerEmail: ticket.buyerEmail,
        ticketType: ticket.ticketType,
        quantity: ticket.quantity,
        checkedIn: true,
        servicesUsed: ticket.servicesUsed || {},
      }
    });
  } catch (err) {
    console.error("❌ Manual Gate Check-In Error:", err);
    res.status(500).json({ success: false, message: "Server error during manual gate check-in." });
  }
});

/**
 * ✅ 3. Validate & Redeem Specific Service (food, drink, store)
 */
router.post("/service", async (req, res) => {
  try {
    const { ticketId, hash, serviceType } = req.body;

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

    // ✅ Must gate check-in first
    if (!ticket.checkedIn) {
      return res.status(409).json({ success: false, message: "⚠️ Must check-in at gate first!" });
    }

    // ✅ Always init servicesUsed if missing
    if (!ticket.servicesUsed) {
      ticket.servicesUsed = { food: false, drink: false, store: false };
    }

    // ✅ Prevent double redeem
    if (ticket.servicesUsed[serviceType]) {
      return res.status(409).json({
        success: false,
        message: `⚠️ ${serviceType.toUpperCase()} service already redeemed!`
      });
    }

    // ✅ Mark service as redeemed
    ticket.servicesUsed[serviceType] = true;

    // ✅ FORCE mongoose to detect nested object change
    ticket.markModified("servicesUsed");
    await ticket.save();

    console.log("✅ Saved servicesUsed:", ticket.servicesUsed);

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
