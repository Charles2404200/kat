import express from "express";
import { prisma } from "../utils/prismaClient.js";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import crypto from "crypto";

const router = express.Router();

const RAILWAY_URL = process.env.APP_URL || "https://kat-production-e428.up.railway.app";
const EXPIRATION_MINUTES = parseInt(process.env.PENDING_TICKET_EXPIRE_MINUTES || "15", 10);

function generateTicketHash(ticketId, email) {
  const secretKey = process.env.QR_SECRET || "super-secret-key";
  return crypto.createHmac("sha256", secretKey).update(ticketId + email).digest("hex");
}

async function getSoldQuantity(ticketType, status) {
  const agg = await prisma.ticket.aggregate({
    _sum: { quantity: true },
    where: { ticketType, status },
  });
  return agg._sum.quantity ?? 0;
}

// ✅ Get available stock
router.get("/available-stock", async (req, res) => {
  try {
    const stocks = await prisma.ticketStock.findMany();

    const summary = await Promise.all(
      stocks.map(async (s) => {
        const sold = await getSoldQuantity(s.ticketType, "paid");
        const pending = await getSoldQuantity(s.ticketType, "pending");
        const remaining = s.total - (sold + pending);

        return {
          ticketType: s.ticketType,
          price: s.price,
          total: s.total,
          remaining: remaining < 0 ? 0 : remaining,
        };
      })
    );

    return res.json({ success: true, summary });
  } catch (err) {
    console.error("❌ Available Stock Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ✅ Create pending ticket
router.post("/create", async (req, res) => {
  try {
    const { buyerEmail, ticketType, quantity, paymentMethod } = req.body;
    const normalizedEmail = buyerEmail.trim().toLowerCase();

    const stock = await prisma.ticketStock.findUnique({ where: { ticketType } });
    if (!stock) {
      return res.status(400).json({ error: "❌ Ticket type not found" });
    }

    const sold = await getSoldQuantity(ticketType, "paid");
    const pending = await getSoldQuantity(ticketType, "pending");
    const remaining = stock.total - (sold + pending);

    if (remaining <= 0 || quantity > remaining) {
      return res.status(400).json({
        error: `❌ Not enough tickets available! Only ${remaining > 0 ? remaining : 0} left.`,
      });
    }

    const existingPaid = await prisma.ticket.findFirst({
      where: { buyerEmail: normalizedEmail, status: "paid" },
    });
    if (existingPaid) {
      return res.status(403).json({
        error: "❌ You already bought a ticket! Each person can only purchase 1 order.",
        ticketType: existingPaid.ticketType,
        quantity: existingPaid.quantity,
        createdAt: existingPaid.createdAt,
      });
    }

    const existingPending = await prisma.ticket.findFirst({
      where: { buyerEmail: normalizedEmail, status: "pending" },
    });
    if (existingPending) {
      const paymentLink = `${RAILWAY_URL}/fake-payment?ticketId=${existingPending.id}`;
      const paymentQRUrl = await QRCode.toDataURL(paymentLink);

      const expiresAt = new Date(existingPending.createdAt.getTime() + EXPIRATION_MINUTES * 60000);

      return res.status(409).json({
        error: "⚠️ You already have a pending ticket. Complete payment first!",
        ticketId: existingPending.id,
        ticketType: existingPending.ticketType,
        quantity: existingPending.quantity,
        amount: existingPending.totalPrice,
        paymentQRUrl,
        paymentLink,
        expiresAt,
      });
    }

    const totalPrice = stock.price * quantity;

    const ticket = await prisma.ticket.create({
      data: {
        buyerEmail: normalizedEmail,
        ticketType,
        quantity,
        totalPrice,
        status: "pending",
        servicesUsed: {},
      },
    });

    const paymentLink = `${RAILWAY_URL}/fake-payment?ticketId=${ticket.id}`;
    const paymentQRUrl = await QRCode.toDataURL(paymentLink);

    const expiresAt = new Date(ticket.createdAt.getTime() + EXPIRATION_MINUTES * 60000);

    return res.json({
      success: true,
      ticketId: ticket.id,
      amount: totalPrice,
      paymentQRUrl,
      paymentLink,
      expiresAt,
    });
  } catch (err) {
    console.error("❌ Ticket create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Confirm payment
router.post("/confirm-payment", async (req, res) => {
  try {
    const { ticketId } = req.body;

    const ticket = await prisma.ticket.updateMany({
      where: { id: ticketId, status: "pending" },
      data: { status: "paid" },
    });

    if (ticket.count === 0) return res.status(400).json({ error: "Ticket not found or already paid/expired" });

    const updated = await prisma.ticket.findUnique({ where: { id: ticketId } });

    const secureHash = generateTicketHash(updated.id, updated.buyerEmail);

    const eventQRPayload = {
      event: "KAT-2 Festival",
      ticketId: updated.id,
      buyerEmail: updated.buyerEmail,
      ticketType: updated.ticketType,
      quantity: updated.quantity,
      hash: secureHash,
    };

    const eventQRUrl = await QRCode.toDataURL(JSON.stringify(eventQRPayload));

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { qrCodeUrl: eventQRUrl, ticketHash: secureHash },
    });

    await sendTicketEmail(updated.buyerEmail, {
      ...updated,
      qrCodeUrl: eventQRUrl,
    });

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

// ✅ Check ticket status
router.get("/status/:ticketId", async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { status: true, createdAt: true },
    });

    if (!ticket) return res.status(404).json({ success: false, error: "Ticket not found" });

    const expiresAt = new Date(ticket.createdAt.getTime() + EXPIRATION_MINUTES * 60000);

    res.json({ success: true, status: ticket.status, expiresAt });
  } catch (err) {
    console.error("❌ Check Status Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

async function sendTicketEmail(email, ticket) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
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
      <p style="color:gray;font-size:12px;">Ticket ID: ${ticket.id}</p>
    `,
    attachments: [
      { filename: "ticket-qr.png", content: base64Image, encoding: "base64", cid: "eventqr" },
    ],
  });
}

export default router;
