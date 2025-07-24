import { TicketStockRepository } from "../repositories/ticketStockRepository.js";

const stockRepo = new TicketStockRepository();

export class TicketStockService {
  async listAll() {
    return stockRepo.getAll();
  }

  async findByType(ticketType) {
    return stockRepo.findByType(ticketType);
  }

  async createStock(ticketType, total, price) {
    return stockRepo.create({
      ticketType,
      total,
      remaining: total,
      price
    });
  }

  async updateStock(ticketType, newTotal, newPrice) {
    const data = { total: newTotal, remaining: newTotal };
    if (newPrice !== undefined) data.price = newPrice;
    return stockRepo.updateByType(ticketType, data);
  }

  async deleteStock(ticketType) {
    return stockRepo.deleteByType(ticketType);
  }
}
