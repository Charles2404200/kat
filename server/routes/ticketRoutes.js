import express from "express";
import Ticket from "../models/Ticket.js";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import crypto from "crypto";

const router = express.Router();

// ✅ Railway domain
const RAILWAY_URL = "https://kat-production-e428.up.railway.app";

// ✅ Số phút pending được giữ (default 15 phút)
const EXPIRATION_MINUTES = parseInt(process.env.PENDING_TICKET_EXPIRE_MINUTES || "15", 10);

/**
 * ✅ Generate secure hash
 */
function generateTicketHash(ticketId, email) {
  const secretKey = process.env.QR_SECRET || "super-secret-key";
  return crypto.createHmac("sha256", secretKey).update(ticketId + email).digest("hex");
}

/**
 * ✅ Create pending ticket
 */
router.post("/create", async (req, res) => {
  const { buyerEmail, ticketType, quantity, paymentMethod } = req.body;
  const prices = { standard: 500000, vip: 1000000, vvip: 2500000 };
  const totalPrice = prices[ticketType] * quantity;

  const normalizedEmail = buyerEmail.trim().toLowerCase();

  // 1️⃣ Nếu đã có vé paid -> chặn
  const existingPaid = await Ticket.findOne({ buyerEmail: normalizedEmail, status: "paid" });
  if (existingPaid) {
    return res.status(403).json({
      error: "❌ You already bought a ticket! Each person can only purchase 1 ticket.",
      ticketType: existingPaid.ticketType,
      quantity: existingPaid.quantity,
      createdAt: existingPaid.createdAt,
    });
  }

  // 2️⃣ Nếu có pending -> trả lại cùng QR (không tạo thêm)
  const existingPending = await Ticket.findOne({ buyerEmail: normalizedEmail, status: "pending" });
  if (existingPending) {
    const paymentLink = `${RAILWAY_URL}/fake-payment?ticketId=${existingPending._id}`;
    const paymentQRUrl = await QRCode.toDataURL(paymentLink);

    // Tính thời gian hết hạn dựa trên createdAt + expireMinutes
    const expiresAt = new Date(existingPending.createdAt.getTime() + EXPIRATION_MINUTES * 60000);

    return res.status(409).json({
      error: "⚠️ You already have a pending ticket. Complete payment first!",
      ticketId: existingPending._id,
      ticketType: existingPending.ticketType,
      quantity: existingPending.quantity,
      amount: existingPending.totalPrice,
      paymentQRUrl,
      paymentLink,
      expiresAt // ✅ FE có thể hiển thị đếm ngược
    });
  }

  // 3️⃣ Tạo vé pending mới
  const ticket = await Ticket.create({
    buyerEmail: normalizedEmail,
    ticketType,
    quantity,
    totalPrice,
    status: "pending",
    paymentMethod
  });

  const paymentLink = `${RAILWAY_URL}/fake-payment?ticketId=${ticket._id}`;
  const paymentQRUrl = await QRCode.toDataURL(paymentLink);

  // ✅ FE sẽ tự tính expiresAt từ createdAt
  const expiresAt = new Date(ticket.createdAt.getTime() + EXPIRATION_MINUTES * 60000);

  res.json({
    success: true,
    ticketId: ticket._id,
    amount: totalPrice,
    paymentQRUrl,
    paymentLink,
    expiresAt
  });
});

/**
 * ✅ Confirm payment -> chuyển sang paid
 */
router.post("/confirm-payment", async (req, res) => {
  try {
    const { ticketId } = req.body;

    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, status: "pending" },
      { status: "paid" },
      { new: true }
    );

    if (!ticket) return res.status(400).json({ error: "Ticket not found or already paid/expired" });

    const secureHash = generateTicketHash(ticket._id.toString(), ticket.buyerEmail);

    const eventQRPayload = {
      event: "KAT-2 Festival",
      ticketId: ticket._id,
      buyerEmail: ticket.buyerEmail,
      ticketType: ticket.ticketType,
      quantity: ticket.quantity,
      hash: secureHash
    };

    const eventQRString = JSON.stringify(eventQRPayload);
    const eventQRUrl = await QRCode.toDataURL(eventQRString);

    ticket.qrCodeUrl = eventQRUrl;
    ticket.ticketHash = secureHash;
    await ticket.save();

    await sendTicketEmail(ticket.buyerEmail, ticket);

    res.json({
      success: true,
      message: "✅ Payment confirmed! Unique ticket QR sent via email.",
      eventQRUrl
    });
  } catch (err) {
    console.error("❌ Confirm Payment Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * ✅ Check ticket status
 */
router.get("/status/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findById(ticketId).select("status createdAt");

    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });

    // FE có thể tự tính expireAt = createdAt + expireMinutes
    const expiresAt = new Date(ticket.createdAt.getTime() + EXPIRATION_MINUTES * 60000);

    res.json({ success: true, status: ticket.status, expiresAt });
  } catch (err) {
    console.error("❌ Check Status Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * ✅ Send ticket email
 */
async function sendTicketEmail(email, ticket) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

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
        cid: "eventqr"
      }
    ]
  });
}

export default router;
