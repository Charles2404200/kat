import { TicketRepository } from "../repositories/ticketRepository.js";

const ticketRepo = new TicketRepository();

export class ActivityLogService {
  async getActivityLogs() {
    const tickets = await ticketRepo.getAll(); // Prisma findMany()
    return tickets.map((t) => ({
      email: t.buyerEmail,
      ticketType: t.ticketType?.toUpperCase(),
      checkedInAt: t.checkedInAt
        ? new Date(t.checkedInAt).toLocaleString("en-GB")
        : null,
      foodAt: t.servicesUsed?.foodAt
        ? new Date(t.servicesUsed.foodAt).toLocaleString("en-GB")
        : null,
      drinkAt: t.servicesUsed?.drinkAt
        ? new Date(t.servicesUsed.drinkAt).toLocaleString("en-GB")
        : null,
      storeAt: t.servicesUsed?.storeAt
        ? new Date(t.servicesUsed.storeAt).toLocaleString("en-GB")
        : null,
    }));
  }
}
