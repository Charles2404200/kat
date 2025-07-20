import express from "express";
import Ticket from "../models/Ticket.js";
import { Parser } from "json2csv";  // ✅ For CSV export

const router = express.Router();

// Load admin credentials from .env
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const ADMIN_TOKEN = "admin-secret-token"; // simple static token for now

/**
 * ✅ Admin Login (reads from .env)
 */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  console.log("🔑 Login attempt:", username, password);
  console.log("✅ Expected from ENV:", ADMIN_USER, ADMIN_PASS);

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
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const tickets = await Ticket.find().sort({ createdAt: -1 });

  // ✅ Log to debug servicesUsed
  console.log("📋 Tickets for admin:", tickets.map(t => ({
    email: t.buyerEmail,
    servicesUsed: t.servicesUsed
  })));

  res.json({ success: true, tickets });
});

/**
 * ✅ Delete ticket by ID
 */
router.delete("/ticket/:id", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  await Ticket.findByIdAndDelete(id);
  res.json({ success: true, message: "Ticket deleted" });
});

/**
 * ✅ Dashboard stats
 */
router.get("/dashboard", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const totalTickets = await Ticket.countDocuments();
  const checkedInTickets = await Ticket.countDocuments({ checkedIn: true });
  const notCheckedInTickets = totalTickets - checkedInTickets;

  // ✅ Services used
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
 * ✅ Export tickets as CSV
 */
router.get("/export", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const tickets = await Ticket.find().lean();

  // ✅ Prepare export-friendly data
  const exportData = tickets.map(t => ({
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
 * ✅ Danh sách user đã dùng ít nhất 1 dịch vụ
 */
router.get("/service-usage", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

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
 * ✅ Export only Service Usage as CSV
 */
router.get("/export-services", async (req, res) => {
  const { token } = req.headers;
  if (token !== ADMIN_TOKEN) return res.status(403).json({ error: "Unauthorized" });

  const tickets = await Ticket.find({
    $or: [
      { "servicesUsed.food": true },
      { "servicesUsed.drink": true },
      { "servicesUsed.store": true }
    ]
  }).lean();

  const exportData = tickets.map(t => ({
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


export default router;
