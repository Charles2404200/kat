import { prisma } from "../utils/prismaClient.js";

export class TicketRepository {
  async getAll() {
    return prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id) {
    return prisma.ticket.findUnique({ where: { id } });
  }

  async create(data) {
    return prisma.ticket.create({ data });
  }

  async update(id, data) {
    return prisma.ticket.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.ticket.delete({ where: { id } });
  }

  async count(filter = {}) {
    return prisma.ticket.count({ where: filter });
  }
}
