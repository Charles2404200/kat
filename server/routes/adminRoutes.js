/* eslint-env node */
import express from "express";
import Ticket from "../models/Ticket.js";
import TicketStock from "../models/TicketStock.js";
import { Parser } from "json2csv";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();
const router = express.Router();

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "123456";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin-secret-token";

const LOG_FILE = path.join(process.cwd(), "logs.json");

// ✅ Helper log
export function appendLog(action, email, staff = "System") {
  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  }

  logs.unshift({
    time: new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }),
    email,
    action,
    staff
  });

  if (logs.length > 500) logs = logs.slice(0, 500);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

/**
 * ✅ Admin login
 */
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ success: true, token: ADMIN_TOKEN });
  }
  return res.status(401).json({ success: false, error: "Invalid credentials" });
});

/**
 * ✅ Get all tickets
 */
router.get("/tickets", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });
  const tickets = await Ticket.find().sort({ createdAt: -1 });
  res.json({ success: true, tickets });
});

/**
 * ✅ Delete ticket
 */
router.delete("/ticket/:id", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

  const ticket = await Ticket.findByIdAndDelete(req.params.id);
  if (ticket) appendLog("🗑 Ticket deleted", ticket.buyerEmail, "Admin");

  res.json({ success: true, message: "Ticket deleted" });
});

/**
 * ✅ Dashboard stats
 */
router.get("/dashboard", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

  const totalTickets = await Ticket.countDocuments();
  const checkedInTickets = await Ticket.countDocuments({ checkedIn: true });
  const notCheckedInTickets = totalTickets - checkedInTickets;

  const serviceStats = {
    food: await Ticket.countDocuments({ "servicesUsed.food": true }),
    drink: await Ticket.countDocuments({ "servicesUsed.drink": true }),
    store: await Ticket.countDocuments({ "servicesUsed.store": true })
  };

  res.json({
    success: true,
    stats: {
      totalTickets,
      checkedInTickets,
      notCheckedInTickets,
      serviceStats
    }
  });
});

/**
 * ✅ Service usage list
 */
router.get("/service-usage", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

  const tickets = await Ticket.find({
    $or: [
      { "servicesUsed.food": true },
      { "servicesUsed.drink": true },
      { "servicesUsed.store": true }
    ]
  }).sort({ updatedAt: -1 });

  res.json({ success: true, tickets });
});

/**
 * ✅ Export tickets as CSV
 */
router.get("/export", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

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
    createdAt: t.createdAt ? new Date(t.createdAt).toLocaleString() : ""
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
    "createdAt"
  ];
  const json2csv = new Parser({ fields });
  const csv = json2csv.parse(exportData);

  res.header("Content-Type", "text/csv");
  res.attachment("tickets_export.csv");
  return res.send(csv);
});

/**
 * ✅ Export service usage CSV
 */
router.get("/export-services", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

  const tickets = await Ticket.find({
    $or: [
      { "servicesUsed.food": true },
      { "servicesUsed.drink": true },
      { "servicesUsed.store": true }
    ]
  }).lean();

  const exportData = tickets.map((t) => ({
    Email: t.buyerEmail,
    TicketType: t.ticketType,
    CheckedIn: t.checkedIn ? "Yes" : "No",
    Food: t.servicesUsed?.food ? "Yes" : "No",
    Drink: t.servicesUsed?.drink ? "Yes" : "No",
    Store: t.servicesUsed?.store ? "Yes" : "No",
    UpdatedAt: t.updatedAt ? new Date(t.updatedAt).toLocaleString() : ""
  }));

  const fields = ["Email", "TicketType", "CheckedIn", "Food", "Drink", "Store", "UpdatedAt"];
  const parser = new Parser({ fields });
  const csv = parser.parse(exportData);

  res.header("Content-Type", "text/csv");
  res.attachment("service_usage.csv");
  return res.send(csv);
});

/**
 * ✅ Get Logs
 */
router.get("/logs", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN) return res.status(403).json({ success: false, error: "Unauthorized" });

  let logs = [];
  if (fs.existsSync(LOG_FILE)) logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  res.json({ success: true, logs });
});

/**
 * ✅ Ticket stock summary (tính sold bằng $sum quantity)
 */
router.get("/ticket-stock-summary", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN) return res.status(403).json({ success: false, error: "Unauthorized" });

  try {
    const stocks = await TicketStock.find().lean();

    const summary = await Promise.all(
      stocks.map(async (s) => {
        // ✅ tổng vé đã bán (sum quantity)
        const agg = await Ticket.aggregate([
          { $match: { ticketType: s.ticketType, status: "paid" } },
          { $group: { _id: null, totalSold: { $sum: "$quantity" } } }
        ]);
        const sold = agg.length > 0 ? agg[0].totalSold : 0;
        const remaining = s.total - sold;

        return {
          ticketType: s.ticketType,
          price: s.price,
          total: s.total,
          sold,
          remaining: remaining < 0 ? 0 : remaining
        };
      })
    );

    return res.json({ success: true, summary });
  } catch (err) {
    console.error("❌ Stock summary error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * ✅ Admin update max stock (validate $sum quantity)
 */
router.post("/update-stock", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN) return res.status(403).json({ success: false, error: "Unauthorized" });

  const { ticketType, newTotal, newPrice } = req.body;
  if (!ticketType || typeof newTotal !== "number") {
    return res.status(400).json({ success: false, error: "ticketType & newTotal required!" });
  }

  try {
    const stock = await TicketStock.findOne({ ticketType });
    if (!stock) return res.status(404).json({ success: false, error: "Ticket type not found!" });

    // ✅ tổng vé đã bán
    const agg = await Ticket.aggregate([
      { $match: { ticketType, status: "paid" } },
      { $group: { _id: null, totalSold: { $sum: "$quantity" } } }
    ]);
    const sold = agg.length > 0 ? agg[0].totalSold : 0;

    if (newTotal < sold) {
      return res.status(400).json({
        success: false,
        error: `❌ Cannot reduce below sold tickets (${sold})`
      });
    }

    stock.total = newTotal;
    if (newPrice && typeof newPrice === "number") stock.price = newPrice;
    await stock.save();

    appendLog(
      `🔧 Admin updated stock for ${ticketType}: total=${newTotal}${newPrice ? `, price=${newPrice}` : ""}`,
      "admin@system",
      "Admin"
    );

    return res.json({
      success: true,
      message: `✅ Stock updated for ${ticketType}`,
      data: stock
    });
  } catch (err) {
    console.error("❌ Update Stock Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

/**
 * ✅ Admin add new ticket type
 */
router.post("/add-stock", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN) return res.status(403).json({ success: false, error: "Unauthorized" });

  const { ticketType, total, price } = req.body;
  if (!ticketType || !total || !price)
    return res.status(400).json({ success: false, error: "ticketType, total, price required" });

  const exists = await TicketStock.findOne({ ticketType });
  if (exists) return res.status(400).json({ success: false, error: "Ticket type already exists!" });

  const stock = await TicketStock.create({ ticketType, total, price });
  appendLog(`➕ Added new stock type ${ticketType}`, "admin@system", "Admin");

  res.json({ success: true, message: "Stock created", stock });
});

export default router;
