const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("No MONGODB_URI in environment.");
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Get collection names
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));

  // Find last 10 stock movements
  const movements = await mongoose.connection.db.collection("stockmovements")
    .find({})
    .sort({ createdAt: -1 })
    .limit(15)
    .toArray();

  console.log("\nLast 15 Stock Movements:");
  console.log(JSON.stringify(movements, null, 2));

  // Count items by type
  const counts = await mongoose.connection.db.collection("stockmovements")
    .aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]).toArray();
  console.log("\nMovements Count by Type:", counts);

  await mongoose.disconnect();
}

run().catch(console.error);
