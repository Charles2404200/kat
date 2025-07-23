import express from "express";
import Ticket from "../models/Ticket.js";
import crypto from "crypto";
import { appendLog } from "./adminRoutes.js";

const router = express.Router();

// helper generate hash cho QR code (dùng HMAC SHA256 + secret key)
function generateTicketHash(ticketId, email) {
  const secretKey = process.env.QR_SECRET || "super-secret-key"; // fallback nếu chưa set env
  return crypto.createHmac("sha256", secretKey).update(ticketId + email).digest("hex");
}

/**
 * Validate QR – chỉ check vé hợp lệ hay không, chưa thay đổi DB
 */
router.post("/validate", async (req, res) => {
  try {
    const { ticketId, hash } = req.body;
    const ticket = await Ticket.findById(ticketId);

    // vé không tồn tại hoặc chưa thanh toán => reject
    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Invalid or unpaid ticket!" });
    }

    // check hash xem QR có bị chỉnh sửa không
    const expectedHash = generateTicketHash(ticket._id.toString(), ticket.buyerEmail);
    if (hash !== expectedHash) {
      return res.status(403).json({ success: false, message: "❌ Security check failed! QR tampered." });
    }

    // nếu đã check-in thì warning, còn chưa thì OK
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
 * Manual Gate Check-In – nhân viên quét vé và confirm check-in (ghi lại DB)
 */
router.post("/manual-gate", async (req, res) => {
  try {
    const { ticketId } = req.body;
    const ticket = await Ticket.findById(ticketId);

    // vé không tồn tại hoặc chưa thanh toán
    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Invalid or unpaid ticket!" });
    }

    // vé đã check-in rồi thì không cho check-in lại
    if (ticket.checkedIn) {
      return res.status(409).json({ success: false, message: "⚠️ Ticket already checked in!" });
    }

    // mark vé là đã check-in
    ticket.checkedIn = true;
    await ticket.save();

    // ghi log để tracking
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
 * Redeem QR cho 1 dịch vụ cụ thể (food/drink/store)
 */
router.post("/service", async (req, res) => {
  try {
    const { ticketId, hash, serviceType } = req.body;

    // check serviceType có hợp lệ không
    if (!["food", "drink", "store"].includes(serviceType)) {
      return res.status(400).json({ success: false, message: "❌ Invalid service!" });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: "❌ Invalid ticket!" });
    }

    // verify hash xem QR có bị sửa
    const expectedHash = generateTicketHash(ticket._id.toString(), ticket.buyerEmail);
    if (hash !== expectedHash) {
      return res.status(403).json({ success: false, message: "❌ QR tampered or invalid!" });
    }

    // bắt buộc phải check-in gate trước mới redeem service được
    if (!ticket.checkedIn) {
      return res.status(409).json({ success: false, message: "⚠️ Must check-in first!" });
    }

    // nếu chưa có servicesUsed thì khởi tạo object
    if (!ticket.servicesUsed) ticket.servicesUsed = {};

    // nếu service này đã dùng rồi => báo lỗi, không cho dùng lại
    if (ticket.servicesUsed[serviceType]) {
      return res.status(409).json({ success: false, message: `⚠️ ${serviceType} already used` });
    }

    // mark service đã redeem và lưu thời gian dùng
    ticket.servicesUsed[serviceType] = true;
    ticket.servicesUsed[`${serviceType}At`] = new Date();   
    ticket.markModified("servicesUsed");
    await ticket.save();

    // ghi log staff redeem service
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
