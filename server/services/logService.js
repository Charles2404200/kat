import { LogRepository } from "../repositories/logRepository.js";

const logRepo = new LogRepository();

export class LogService {
  async listAll() {
    return logRepo.getAll();
  }

  async listByTicket(ticketId) {
    return logRepo.findByTicket(ticketId);
  }

  async addLog(ticketId, buyerEmail, action, staff = "system") {
    return logRepo.create({
      ticketId,
      buyerEmail,
      action,
      staff
    });
  }

  async deleteLog(id) {
    return logRepo.delete(id);
  }

  async deleteLogsByTicket(ticketId) {
    return logRepo.deleteByTicket(ticketId);
  }
}
