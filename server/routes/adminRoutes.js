import express from "express";
import { prisma } from "../utils/prismaClient.js";
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
      second: "2-digit",
    }),
    email,
    action,
    staff,
  });

  if (logs.length > 500) logs = logs.slice(0, 500);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

// ✅ Admin login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ success: true, token: ADMIN_TOKEN });
  }
  return res.status(401).json({ success: false, error: "Invalid credentials" });
});

// ✅ Lấy toàn bộ vé
router.get("/tickets", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN)
    return res.status(403).json({ error: "Unauthorized" });

  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, tickets });
});

// ✅ Xoá vé
router.delete("/ticket/:id", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN)
    return res.status(403).json({ error: "Unauthorized" });

  const ticket = await prisma.ticket.delete({
    where: { id: req.params.id },
  });
  if (ticket) appendLog("🗑 Ticket deleted", ticket.buyerEmail, "Admin");

  res.json({ success: true, message: "Ticket deleted" });
});

// ✅ Dashboard stats
router.get("/dashboard", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN)
    return res.status(403).json({ error: "Unauthorized" });

  const totalTickets = await prisma.ticket.count();
  const checkedInTickets = await prisma.ticket.count({
    where: { checkedIn: true },
  });
  const notCheckedInTickets = totalTickets - checkedInTickets;

  const serviceStats = {
    food: await prisma.ticket.count({
      where: { servicesUsed: { path: ["food"], equals: true } },
    }),
    drink: await prisma.ticket.count({
      where: { servicesUsed: { path: ["drink"], equals: true } },
    }),
    store: await prisma.ticket.count({
      where: { servicesUsed: { path: ["store"], equals: true } },
    }),
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

// ✅ Lấy vé có dùng dịch vụ
router.get("/service-usage", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN)
    return res.status(403).json({ error: "Unauthorized" });

  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { servicesUsed: { path: ["food"], equals: true } },
        { servicesUsed: { path: ["drink"], equals: true } },
        { servicesUsed: { path: ["store"], equals: true } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, tickets });
});

// ✅ Export CSV
router.get("/export", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN)
    return res.status(403).json({ error: "Unauthorized" });

  const tickets = await prisma.ticket.findMany();

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
  const parser = new Parser({ fields });
  const csv = parser.parse(exportData);

  res.header("Content-Type", "text/csv");
  res.attachment("tickets_export.csv");
  return res.send(csv);
});

// ✅ Stock summary
router.get("/ticket-stock-summary", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN)
    return res.status(403).json({ success: false, error: "Unauthorized" });

  const stocks = await prisma.ticketStock.findMany();

  const summary = await Promise.all(
    stocks.map(async (s) => {
      const sold = await prisma.ticket.aggregate({
        _sum: { quantity: true },
        where: { ticketType: s.ticketType, status: "paid" },
      });
      const soldQty = sold._sum.quantity ?? 0;
      const remaining = s.total - soldQty;

      return {
        ticketType: s.ticketType,
        price: s.price,
        total: s.total,
        sold: soldQty,
        remaining: remaining < 0 ? 0 : remaining,
      };
    })
  );

  return res.json({ success: true, summary });
});

// ✅ Update stock
router.post("/update-stock", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN)
    return res.status(403).json({ success: false, error: "Unauthorized" });

  const { ticketType, newTotal, newPrice } = req.body;
  if (!ticketType || typeof newTotal !== "number") {
    return res
      .status(400)
      .json({ success: false, error: "ticketType & newTotal required!" });
  }

  const soldAgg = await prisma.ticket.aggregate({
    _sum: { quantity: true },
    where: { ticketType, status: "paid" },
  });
  const sold = soldAgg._sum.quantity ?? 0;

  if (newTotal < sold) {
    return res.status(400).json({
      success: false,
      error: `❌ Cannot reduce below sold tickets (${sold})`,
    });
  }

  const stock = await prisma.ticketStock.update({
    where: { ticketType },
    data: {
      total: newTotal,
      ...(newPrice && { price: newPrice }),
    },
  });

  appendLog(
    `🔧 Admin updated stock for ${ticketType}: total=${newTotal}${
      newPrice ? `, price=${newPrice}` : ""
    }`,
    "admin@system",
    "Admin"
  );

  return res.json({
    success: true,
    message: `✅ Stock updated for ${ticketType}`,
    data: stock,
  });
});

// ✅ Add new stock
router.post("/add-stock", async (req, res) => {
  if (req.headers.token !== ADMIN_TOKEN)
    return res.status(403).json({ success: false, error: "Unauthorized" });

  const { ticketType, total, price } = req.body;
  if (!ticketType || !total || !price)
    return res
      .status(400)
      .json({ success: false, error: "ticketType, total, price required" });

  const exists = await prisma.ticketStock.findUnique({
    where: { ticketType },
  });
  if (exists)
    return res
      .status(400)
      .json({ success: false, error: "Ticket type already exists!" });

  const stock = await prisma.ticketStock.create({
    data: { ticketType, total, remaining: total, price },
  });

  appendLog(`➕ Added new stock type ${ticketType}`, "admin@system", "Admin");

  res.json({ success: true, message: "Stock created", stock });
});

export default router;
