const { User } = require("../models/user.model");

class UserRepository {
  async create(data) {
    return User.create({
      companyName: data.companyName,
      email: data.email,
      password: data.password,
    });
  }

  async findByEmail(email) {
    return User.findOne({ email }).lean();
  }

  /** Password is select:false on the schema — only opt in where the hash is
   * actually needed (login's compare step). */
  async findByEmailWithPassword(email) {
    return User.findOne({ email }).select("+password").lean();
  }

  async findById(id) {
    return User.findById(id).lean();
  }
}

const userRepository = new UserRepository();

module.exports = { UserRepository, userRepository };
