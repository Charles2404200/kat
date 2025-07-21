/* eslint-env node */
import express from "express";
import Ticket from "../models/Ticket.js";
import { Parser } from "json2csv";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();
const router = express.Router();

// ✅ Hardcode username/password
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "123456";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin-secret-token";

// ✅ Log file path
const LOG_FILE = path.join(process.cwd(), "logs.json");

// ✅ Helper: append a log entry
export function appendLog(action, email, staff = "System") {
  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  }

  logs.unshift({
    time: new Date().toLocaleString("en-GB", { 
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }),  // ✅ sẽ ra "21/07/2025, 15:30:10"
    email,
    action,
    staff,
  });

  // ✅ keep only last 500 logs
  if (logs.length > 500) logs = logs.slice(0, 500);

  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

/**
 * ✅ Admin Login (hardcoded credentials)
 */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  console.log("🔑 Login attempt:", username, password);

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    console.log("❌ Invalid credentials");
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }
});

/**
 * ✅ Get all tickets (admin only)
 */
router.get("/tickets", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

  const tickets = await Ticket.find().sort({ createdAt: -1 });

  console.log(
    "📋 Tickets for admin:",
    tickets.map((t) => ({
      email: t.buyerEmail,
      servicesUsed: t.servicesUsed,
    }))
  );

  res.json({ success: true, tickets });
});

/**
 * ✅ Delete ticket by ID
 */
router.delete("/ticket/:id", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

  const { id } = req.params;
  const ticket = await Ticket.findByIdAndDelete(id);

  if (ticket) {
    appendLog("🗑 Ticket deleted", ticket.buyerEmail, "Admin");
  }

  res.json({ success: true, message: "Ticket deleted" });
});

/**
 * ✅ Dashboard stats
 */
router.get("/dashboard", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

  const totalTickets = await Ticket.countDocuments();
  const checkedInTickets = await Ticket.countDocuments({ checkedIn: true });
  const notCheckedInTickets = totalTickets - checkedInTickets;

  // ✅ Count services usage
  const serviceStats = {
    food: await Ticket.countDocuments({ "servicesUsed.food": true }),
    drink: await Ticket.countDocuments({ "servicesUsed.drink": true }),
    store: await Ticket.countDocuments({ "servicesUsed.store": true }),
  };

  res.json({
    success: true,
    stats: {
      totalTickets,
      checkedInTickets,
      notCheckedInTickets,
      serviceStats,
    },
  });
});

/**
 * ✅ Danh sách user đã dùng ít nhất 1 dịch vụ
 */
router.get("/service-usage", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

  const tickets = await Ticket.find({
    $or: [
      { "servicesUsed.food": true },
      { "servicesUsed.drink": true },
      { "servicesUsed.store": true },
    ],
  })
    .sort({ updatedAt: -1 })
    .lean();

  res.json({ success: true, tickets });
});

/**
 * ✅ Export tickets as CSV
 */
router.get("/export", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

  const tickets = await Ticket.find().lean();

  const exportData = tickets.map((t) => ({
    email: t.buyerEmail,
    ticketType: t.ticketType,
    quantity: t.quantity,
    status: t.status,
    checkedIn: t.checkedIn ? "Yes" : "No",
    foodUsed: t.servicesUsed?.food ? "Yes" : "No",
    drinkUsed: t.servicesUsed?.drink ? "Yes" : "No",
    storeUsed: t.servicesUsed?.store ? "Yes" : "No",
    createdAt: t.createdAt ? new Date(t.createdAt).toLocaleString() : "",
  }));

  const fields = [
    "email",
    "ticketType",
    "quantity",
    "status",
    "checkedIn",
    "foodUsed",
    "drinkUsed",
    "storeUsed",
    "createdAt",
  ];

  const json2csv = new Parser({ fields });
  const csv = json2csv.parse(exportData);

  res.header("Content-Type", "text/csv");
  res.attachment("tickets_export.csv");
  return res.send(csv);
});

/**
 * ✅ Export only Service Usage as CSV
 */
router.get("/export-services", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

  const tickets = await Ticket.find({
    $or: [
      { "servicesUsed.food": true },
      { "servicesUsed.drink": true },
      { "servicesUsed.store": true },
    ],
  }).lean();

  const exportData = tickets.map((t) => ({
    Email: t.buyerEmail,
    TicketType: t.ticketType,
    CheckedIn: t.checkedIn ? "Yes" : "No",
    Food: t.servicesUsed?.food ? "Yes" : "No",
    Drink: t.servicesUsed?.drink ? "Yes" : "No",
    Store: t.servicesUsed?.store ? "Yes" : "No",
    UpdatedAt: t.updatedAt ? new Date(t.updatedAt).toLocaleString() : "",
  }));

  const fields = [
    "Email",
    "TicketType",
    "CheckedIn",
    "Food",
    "Drink",
    "Store",
    "UpdatedAt",
  ];
  const parser = new Parser({ fields });
  const csv = parser.parse(exportData);

  res.header("Content-Type", "text/csv");
  res.attachment("service_usage.csv");
  return res.send(csv);
});

/**
 * ✅ NEW: Get Logs (admin only)
 */
router.get("/logs", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN)
    return res.status(403).json({ success: false, error: "Unauthorized" });

  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  }

  res.json({ success: true, logs });
});

export default router;
