import { TicketRepository } from "../repositories/ticketRepository.js";

const ticketRepo = new TicketRepository();

export class TicketService {
  async listTickets() {
    return ticketRepo.getAll();
  }

  async findTicket(id) {
    return ticketRepo.findById(id);
  }

  async createPendingTicket(buyerEmail, ticketType, quantity, totalPrice, paymentMethod) {
    return ticketRepo.create({
      buyerEmail,
      ticketType,
      quantity,
      totalPrice,
      status: "pending",
      paymentMethod,
      servicesUsed: { food: false, drink: false, store: false }
    });
  }

  async confirmPayment(ticketId, qrCodeUrl, ticketHash) {
    return ticketRepo.update(ticketId, {
      status: "paid",
      qrCodeUrl,
      ticketHash
    });
  }

  async checkIn(ticketId) {
    return ticketRepo.update(ticketId, {
      checkedIn: true
    });
  }

  async redeemService(ticketId, serviceType) {
    const ticket = await ticketRepo.findById(ticketId);
    if (!ticket) return null;

    const servicesUsed = ticket.servicesUsed || {};
    servicesUsed[serviceType] = true;
    servicesUsed[`${serviceType}At`] = new Date();

    return ticketRepo.update(ticketId, { servicesUsed });
  }

  async deleteTicket(ticketId) {
    return ticketRepo.delete(ticketId);
  }

  async countTickets(filter = {}) {
    return ticketRepo.count(filter);
  }
}
