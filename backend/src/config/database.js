const mongoose = require("mongoose");

const { env } = require("./env");

mongoose.set("strictQuery", true);

async function connectDatabase() {
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  await mongoose.connect(env.MONGODB_URI);
  console.log("Database connected");
}

async function disconnectDatabase() {
  await mongoose.disconnect();
  console.log("Database disconnected");
}

module.exports = { connectDatabase, disconnectDatabase };
