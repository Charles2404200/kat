import express from "express";
import { prisma } from "../utils/prismaClient.js";
import { appendLog } from "./adminRoutes.js";

const router = express.Router();

//  Manual Service Redeem (no QR)
router.post("/manual-service", async (req, res) => {
  try {
    const { ticketId, serviceType } = req.body;
    if (!["food", "drink", "store"].includes(serviceType)) {
      return res.status(400).json({ success: false, message: " Invalid service type!" });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });

    if (!ticket || ticket.status !== "paid") {
      return res.status(404).json({ success: false, message: " Ticket not valid or unpaid!" });
    }

    if (!ticket.checkedIn) {
      return res.status(409).json({
        success: false,
        message: " Must check-in at gate first before redeeming any service!",
      });
    }

    const usedServices = ticket.servicesUsed || {};
    if (usedServices[serviceType]) {
      return res.status(409).json({
        success: false,
        message: ` ${serviceType.toUpperCase()} already redeemed!`,
      });
    }

    usedServices[serviceType] = true;

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { servicesUsed: usedServices },
    });

    appendLog(` SERVICE REDEEM - ${serviceType.toUpperCase()}`, ticket.buyerEmail, "Staff");

    return res.json({
      success: true,
      message: ` ${serviceType.toUpperCase()} service redeemed successfully!`,
      ticketInfo: updatedTicket,
    });
  } catch (err) {
    console.error(" Manual Service Redeem Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during service redeem",
    });
  }
});

export default router;
