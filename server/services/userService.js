import bcrypt from "bcryptjs";
import { UserRepository } from "../repositories/userRepository.js";

const userRepo = new UserRepository();

export class UserService {
  async listAll() {
    return userRepo.getAll();
  }

  async findByEmail(email) {
    return userRepo.findByEmail(email);
  }

  async findById(id) {
    return userRepo.findById(id);
  }

  async register(name, email, password, role = "customer") {
    const hashedPwd = await bcrypt.hash(password, 10);
    return userRepo.create({
      name,
      email,
      password: hashedPwd,
      role
    });
  }

  async verifyPassword(user, plainPassword) {
    return bcrypt.compare(plainPassword, user.password);
  }

  async updateUser(id, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return userRepo.update(id, data);
  }

  async deleteUser(id) {
    return userRepo.delete(id);
  }
}
