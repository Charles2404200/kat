import express from "express";
import Ticket from "../models/Ticket.js";
import TicketStock from "../models/TicketStock.js";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import crypto from "crypto";

const router = express.Router();

const RAILWAY_URL = "https://kat-production-e428.up.railway.app";
const EXPIRATION_MINUTES = parseInt(process.env.PENDING_TICKET_EXPIRE_MINUTES || "15", 10);

/**
 * ✅ Generate secure hash
 */
function generateTicketHash(ticketId, email) {
  const secretKey = process.env.QR_SECRET || "super-secret-key";
  return crypto.createHmac("sha256", secretKey).update(ticketId + email).digest("hex");
}

/**
 * ✅ Helper: sum quantity for given status
 */
async function getSoldQuantity(ticketType, status) {
  const agg = await Ticket.aggregate([
    { $match: { ticketType, status } },
    { $group: { _id: null, totalQty: { $sum: "$quantity" } } }
  ]);
  return agg.length > 0 ? agg[0].totalQty : 0;
}

/**
 * ✅ API FE fetch stock & remaining (cộng dồn quantity)
 */
router.get("/available-stock", async (req, res) => {
  try {
    const stocks = await TicketStock.find().lean();

    const summary = await Promise.all(
      stocks.map(async (s) => {
        const sold = await getSoldQuantity(s.ticketType, "paid");
        const pending = await getSoldQuantity(s.ticketType, "pending");
        const remaining = s.total - (sold + pending);

        return {
          ticketType: s.ticketType,
          price: s.price,
          total: s.total,
          remaining: remaining < 0 ? 0 : remaining
        };
      })
    );

    return res.json({ success: true, summary });
  } catch (err) {
    console.error("❌ Available Stock Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * ✅ Create pending ticket (block nếu vượt stock còn lại)
 */
router.post("/create", async (req, res) => {
  try {
    const { buyerEmail, ticketType, quantity, paymentMethod } = req.body;
    const normalizedEmail = buyerEmail.trim().toLowerCase();

    // 1️⃣ Kiểm tra loại vé có tồn tại không
    const stock = await TicketStock.findOne({ ticketType });
    if (!stock) {
      return res.status(400).json({ error: "❌ Ticket type not found" });
    }

    // 2️⃣ Tính sold + pending (cộng dồn quantity)
    const sold = await getSoldQuantity(ticketType, "paid");
    const pending = await getSoldQuantity(ticketType, "pending");
    const remaining = stock.total - (sold + pending);

    if (remaining <= 0 || quantity > remaining) {
      return res.status(400).json({
        error: `❌ Not enough tickets available! Only ${remaining > 0 ? remaining : 0} left.`,
      });
    }

    // 3️⃣ Nếu đã có vé paid -> chặn
    const existingPaid = await Ticket.findOne({ buyerEmail: normalizedEmail, status: "paid" });
    if (existingPaid) {
      return res.status(403).json({
        error: "❌ You already bought a ticket! Each person can only purchase 1 order.",
        ticketType: existingPaid.ticketType,
        quantity: existingPaid.quantity,
        createdAt: existingPaid.createdAt,
      });
    }

    // 4️⃣ Nếu có pending -> trả lại QR cũ
    const existingPending = await Ticket.findOne({ buyerEmail: normalizedEmail, status: "pending" });
    if (existingPending) {
      const paymentLink = `${RAILWAY_URL}/fake-payment?ticketId=${existingPending._id}`;
      const paymentQRUrl = await QRCode.toDataURL(paymentLink);

      const expiresAt = new Date(existingPending.createdAt.getTime() + EXPIRATION_MINUTES * 60000);

      return res.status(409).json({
        error: "⚠️ You already have a pending ticket. Complete payment first!",
        ticketId: existingPending._id,
        ticketType: existingPending.ticketType,
        quantity: existingPending.quantity,
        amount: existingPending.totalPrice,
        paymentQRUrl,
        paymentLink,
        expiresAt
      });
    }

    // 5️⃣ Tạo vé pending mới
    const totalPrice = stock.price * quantity;

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

    const expiresAt = new Date(ticket.createdAt.getTime() + EXPIRATION_MINUTES * 60000);

    return res.json({
      success: true,
      ticketId: ticket._id,
      amount: totalPrice,
      paymentQRUrl,
      paymentLink,
      expiresAt
    });

  } catch (err) {
    console.error("❌ Ticket create error:", err);
    res.status(500).json({ error: "Server error" });
  }
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
