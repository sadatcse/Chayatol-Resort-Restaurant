const mongoose = require("mongoose");
require("dotenv").config();

const StockMovementSchema = new mongoose.Schema({}, { strict: false });
const StockMovement = mongoose.models.StockMovement || mongoose.model("StockMovement", StockMovementSchema, "stockmovements");

const StockSchema = new mongoose.Schema({}, { strict: false });
const Stock = mongoose.models.Stock || mongoose.model("Stock", StockSchema, "stocks");

const IngredientSchema = new mongoose.Schema({}, { strict: false });
const Ingredient = mongoose.models.Ingredient || mongoose.model("Ingredient", IngredientSchema, "ingredients");

const MONGODB_URI = process.env.MONGODB_URI;

async function testLedger() {
  const ingredientId = "6a292f1302ce7fc235acafc9";
  const stockItem = await Stock.findOne({ ingredient: new mongoose.Types.ObjectId(ingredientId) });
  console.log("Stock item for Tomato:", stockItem);

  const matchQuery = { stock: stockItem._id };
  const movements = await StockMovement.find(matchQuery)
    .sort({ createdAt: 1 })
    .lean();

  console.log("Total movements found:", movements.length);
  console.log("Movements types and dates:");
  movements.forEach((m, idx) => {
    console.log(`${idx + 1}. Type: ${m.type}, Adjustment: ${m.adjustment}, Date: ${m.createdAt}`);
  });
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");
  await testLedger();
  await mongoose.disconnect();
}

run().catch(console.error);
