import { prisma } from "../utils/prismaClient.js";

export class TicketStockRepository {
  async getAll() {
    return prisma.ticketStock.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByType(ticketType) {
    return prisma.ticketStock.findUnique({
      where: { ticketType }
    });
  }

  async create(data) {
    return prisma.ticketStock.create({ data });
  }

  async updateByType(ticketType, data) {
    return prisma.ticketStock.update({
      where: { ticketType },
      data
    });
  }

  async deleteByType(ticketType) {
    return prisma.ticketStock.delete({
      where: { ticketType }
    });
  }
}
