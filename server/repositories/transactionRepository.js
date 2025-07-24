import { prisma } from "../utils/prismaClient.js";

export class TransactionRepository {
  async getAll() {
    return prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: true,
        tickets: true
      }
    });
  }

  async findById(id) {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        buyer: true,
        tickets: true
      }
    });
  }

  async create(data) {
    return prisma.transaction.create({
      data,
      include: {
        buyer: true,
        tickets: true
      }
    });
  }

  async update(id, data) {
    return prisma.transaction.update({
      where: { id },
      data,
      include: {
        buyer: true,
        tickets: true
      }
    });
  }

  async delete(id) {
    return prisma.transaction.delete({
      where: { id }
    });
  }
}
