import { TransactionRepository } from "../repositories/transactionRepository.js";

const transactionRepo = new TransactionRepository();

export class TransactionService {
  async listAll() {
    return transactionRepo.getAll();
  }

  async findById(id) {
    return transactionRepo.findById(id);
  }

  async createTransaction(buyerId, ticketIds, amount, paymentMethod) {
    return transactionRepo.create({
      buyerId,
      tickets: {
        connect: ticketIds.map((ticketId) => ({ id: ticketId }))
      },
      amount,
      paymentMethod,
      status: "pending"
    });
  }

  async updateStatus(id, newStatus) {
    return transactionRepo.update(id, { status: newStatus });
  }

  async deleteTransaction(id) {
    return transactionRepo.delete(id);
  }
}
