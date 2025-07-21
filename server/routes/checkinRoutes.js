import express from "express";
import Ticket from "../models/Ticket.js";
import crypto from "crypto";
import { appendLog } from "./adminRoutes.js";

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
 * ✅ 2. Manual Gate Check-In
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

    ticket.checkedIn = true;
    await ticket.save();

    // ✅ Ghi log
    appendLog("✅ GATE CHECK-IN", ticket.buyerEmail, "Staff");

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
 * ✅ 3. QR Redeem Specific Service
 */
router.post("/service", async (req, res) => {
  try {
    const { ticketId, hash, serviceType } = req.body;

    // ✅ Validate service type
    if (!["food", "drink", "store"].includes(serviceType)) {
      return res.status(400).json({ success: false, message: "❌ Invalid service!" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Invalid ticket!" });
    }

    // ✅ QR hash check
    const expectedHash = generateTicketHash(ticket._id.toString(), ticket.buyerEmail);
    if (hash !== expectedHash) {
      return res.status(403).json({ success: false, message: "❌ QR tampered or invalid!" });
    }

    // ✅ Must gate check-in first
    if (!ticket.checkedIn) {
      return res.status(409).json({ success: false, message: "⚠️ Must check-in first!" });
    }

    // ✅ Init servicesUsed if missing
    if (!ticket.servicesUsed) ticket.servicesUsed = {};

    // ✅ Prevent double redeem
    if (ticket.servicesUsed[serviceType]) {
      return res.status(409).json({ success: false, message: `⚠️ ${serviceType} already used` });
    }

    // ✅ Mark service as redeemed + lưu thời gian redeem
    ticket.servicesUsed[serviceType] = true;
    ticket.servicesUsed[`${serviceType}At`] = new Date();   
    ticket.markModified("servicesUsed");
    await ticket.save();

    // ✅ Log redeem
    appendLog(`✅ ${serviceType.toUpperCase()} REDEEM`, ticket.buyerEmail, "Staff");

    return res.json({
      success: true,
      message: `✅ ${serviceType.toUpperCase()} redeemed successfully`,
      ticketInfo: {
        buyerEmail: ticket.buyerEmail,
        ticketType: ticket.ticketType,
        servicesUsed: ticket.servicesUsed
      }
    });
  } catch (e) {
    console.error("❌ Service Validation Error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
