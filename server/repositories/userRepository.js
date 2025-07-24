import { prisma } from "../utils/prismaClient.js";

export class UserRepository {
  async getAll() {
    return prisma.user.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  async create(data) {
    return prisma.user.create({ data });
  }

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.user.delete({
      where: { id }
    });
  }
}
