import { prisma } from "../utils/prismaClient.js";

export class LogRepository {
  async getAll() {
    return prisma.log.findMany({
      orderBy: { timestamp: 'desc' },
      include: { ticket: true }
    });
  }

  async findByTicket(ticketId) {
    return prisma.log.findMany({
      where: { ticketId },
      orderBy: { timestamp: 'desc' }
    });
  }

  async create(data) {
    return prisma.log.create({ data });
  }

  async delete(id) {
    return prisma.log.delete({
      where: { id }
    });
  }

  async deleteByTicket(ticketId) {
    return prisma.log.deleteMany({
      where: { ticketId }
    });
  }
}
