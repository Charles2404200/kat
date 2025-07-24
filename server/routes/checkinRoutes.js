import express from "express";
import crypto from "crypto";
import { prisma } from "../utils/prismaClient.js";
import { appendLog } from "./adminRoutes.js";

const router = express.Router();

// Helper generate hash QR
function generateTicketHash(ticketId, email) {
  const secretKey = process.env.QR_SECRET || "super-secret-key";
  return crypto.createHmac("sha256", secretKey).update(ticketId + email).digest("hex");
}

// ✅ Validate QR
router.post("/validate", async (req, res) => {
  try {
    const { ticketId, hash } = req.body;
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Invalid or unpaid ticket!" });
    }

    const expectedHash = generateTicketHash(ticket.id, ticket.buyerEmail);
    if (hash !== expectedHash) {
      return res.status(403).json({ success: false, message: "❌ Security check failed! QR tampered." });
    }

    return res.json({
      success: true,
      message: ticket.checkedIn
        ? "⚠️ Ticket already checked in!"
        : "✅ Ticket valid, ready for manual confirmation.",
      ticketInfo: {
        id: ticket.id,
        buyerEmail: ticket.buyerEmail,
        ticketType: ticket.ticketType,
        quantity: ticket.quantity,
        checkedIn: ticket.checkedIn,
        servicesUsed: ticket.servicesUsed || {},
      },
    });
  } catch (err) {
    console.error("❌ Ticket Validation Error:", err);
    res.status(500).json({ success: false, message: "Server error during validation." });
  }
});

// ✅ Manual Gate Check-In
router.post("/manual-gate", async (req, res) => {
  try {
    const { ticketId } = req.body;
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Invalid or unpaid ticket!" });
    }

    if (ticket.checkedIn) {
      return res.status(409).json({ success: false, message: "⚠️ Ticket already checked in!" });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { checkedIn: true },
    });

    appendLog("✅ GATE CHECK-IN", ticket.buyerEmail, "Staff");

    return res.json({
      success: true,
      message: "✅ Gate Check-In Successful!",
      ticketInfo: updatedTicket,
    });
  } catch (err) {
    console.error("❌ Manual Gate Check-In Error:", err);
    res.status(500).json({ success: false, message: "Server error during manual gate check-in." });
  }
});

// ✅ Redeem service (food/drink/store)
router.post("/service", async (req, res) => {
  try {
    const { ticketId, hash, serviceType } = req.body;

    if (!["food", "drink", "store"].includes(serviceType)) {
      return res.status(400).json({ success: false, message: "❌ Invalid service!" });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Invalid ticket!" });
    }

    const expectedHash = generateTicketHash(ticket.id, ticket.buyerEmail);
    if (hash !== expectedHash) {
      return res.status(403).json({ success: false, message: "❌ QR tampered or invalid!" });
    }

    if (!ticket.checkedIn) {
      return res.status(409).json({ success: false, message: "⚠️ Must check-in first!" });
    }

    const usedServices = ticket.servicesUsed || {};
    if (usedServices[serviceType]) {
      return res.status(409).json({ success: false, message: `⚠️ ${serviceType} already used` });
    }

    usedServices[serviceType] = true;
    usedServices[`${serviceType}At`] = new Date();

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { servicesUsed: usedServices },
    });

    appendLog(`✅ ${serviceType.toUpperCase()} REDEEM`, ticket.buyerEmail, "Staff");

    return res.json({
      success: true,
      message: `✅ ${serviceType.toUpperCase()} redeemed successfully`,
      ticketInfo: updatedTicket,
    });
  } catch (e) {
    console.error("❌ Service Validation Error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
