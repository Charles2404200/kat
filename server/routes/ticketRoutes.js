import express from "express";
import Ticket from "../models/Ticket.js";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import crypto from "crypto"; // ✅ Secure hash for tickets

const router = express.Router();

// ✅ Railway frontend/backend domain
const RAILWAY_URL = "https://kat-production-e428.up.railway.app";

/**
 * Helper: generate a secure hash for ticket
 */
function generateTicketHash(ticketId, email) {
  const secretKey = process.env.QR_SECRET || "super-secret-key";
  return crypto.createHmac("sha256", secretKey).update(ticketId + email).digest("hex");
}

/**
 * ✅ Create pending ticket & return Payment QR Code
 */
router.post("/create", async (req, res) => {
  const { buyerEmail, ticketType, quantity, paymentMethod } = req.body;
  const prices = { standard: 500000, vip: 1000000, vvip: 2500000 };
  const totalPrice = prices[ticketType] * quantity;

  const normalizedEmail = buyerEmail.trim().toLowerCase();

  // ✅ 1. Block if already paid
  const existingPaid = await Ticket.findOne({ buyerEmail: normalizedEmail, status: "paid" });
  if (existingPaid) {
    return res.status(403).json({
      error: "❌ You already bought a ticket! Each person can only purchase 1 ticket.",
      ticketType: existingPaid.ticketType,
      quantity: existingPaid.quantity,
      createdAt: existingPaid.createdAt,
    });
  }

  // ✅ 2. If pending → return same QR
  const existingPending = await Ticket.findOne({ buyerEmail: normalizedEmail, status: "pending" });
  if (existingPending) {
    const paymentLink = `${RAILWAY_URL}/fake-payment?ticketId=${existingPending._id}`;
    const paymentQRUrl = await QRCode.toDataURL(paymentLink);

    return res.status(409).json({
      error: "⚠️ You already have a pending ticket. Complete payment first!",
      ticketId: existingPending._id,
      ticketType: existingPending.ticketType,
      quantity: existingPending.quantity,
      amount: existingPending.totalPrice,
      paymentQRUrl,
      paymentLink,
    });
  }

  // ✅ 3. Create NEW pending ticket
  const ticket = await Ticket.create({
    buyerEmail: normalizedEmail,
    ticketType,
    quantity,
    totalPrice,
    status: "pending",
    paymentMethod,
  });

  const paymentLink = `${RAILWAY_URL}/fake-payment?ticketId=${ticket._id}`;
  const paymentQRUrl = await QRCode.toDataURL(paymentLink);

  res.json({
    success: true,
    ticketId: ticket._id,
    amount: totalPrice,
    paymentQRUrl,
    paymentLink,
  });
});

/**
 * ✅ Confirm payment → mark as paid → issue unique ticket QR
 */
router.post("/confirm-payment", async (req, res) => {
  try {
    const { ticketId } = req.body;

    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, status: "pending" },
      { status: "paid" },
      { new: true }
    );

    if (!ticket) return res.status(400).json({ error: "Ticket not found or already paid" });

    // ✅ Generate secure hash for this ticket
    const secureHash = generateTicketHash(ticket._id.toString(), ticket.buyerEmail);

    // ✅ Create UNIQUE QR payload
    const eventQRPayload = {
      event: "KAT-2 Festival",
      ticketId: ticket._id,
      buyerEmail: ticket.buyerEmail,
      ticketType: ticket.ticketType,
      quantity: ticket.quantity,
      hash: secureHash, // used for validation
    };

    // ✅ Convert payload into base64 string for QR
    const eventQRString = JSON.stringify(eventQRPayload);
    const eventQRUrl = await QRCode.toDataURL(eventQRString);

    // ✅ Save in DB
    ticket.qrCodeUrl = eventQRUrl;
    ticket.ticketHash = secureHash;
    await ticket.save();

    // ✅ Send email with UNIQUE Ticket QR
    await sendTicketEmail(ticket.buyerEmail, ticket);

    res.json({
      success: true,
      message: "✅ Payment confirmed! Unique ticket QR sent via email.",
      eventQRUrl,
    });
  } catch (err) {
    console.error("❌ Confirm Payment Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * ✅ Check ticket status (for polling)
 */
router.get("/status/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findById(ticketId).select("status");

    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });

    res.json({ success: true, status: ticket.status });
  } catch (err) {
    console.error("❌ Check Status Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * ✅ Send email with unique ticket QR
 */
async function sendTicketEmail(email, ticket) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // ✅ Extract base64 image data from the ticket.qrCodeUrl
  const base64Image = ticket.qrCodeUrl.split(";base64,").pop();

  await transporter.sendMail({
    from: '"KAT-2 Event" <no-reply@kat2.com>',
    to: email,
    subject: "🎫 Your Unique KAT-2 Festival Ticket",
    html: `
      <h2>Thank you for your payment!</h2>
      <p><strong>Ticket:</strong> ${ticket.ticketType.toUpperCase()} x${ticket.quantity}</p>
      <p><strong>Total:</strong> ${ticket.totalPrice.toLocaleString()}đ</p>
      <p>This is your unique ticket QR code. Scan it at the entrance to check in.</p>
      <img src="cid:eventqr" alt="Event QR" style="width:250px;border:2px solid #ddd;border-radius:8px"/>
      <p style="color:gray;font-size:12px;">Ticket ID: ${ticket._id}</p>
    `,
    attachments: [
      {
        filename: "ticket-qr.png",
        content: base64Image,
        encoding: "base64",
        cid: "eventqr",
      },
    ],
  });
}

export default router;
