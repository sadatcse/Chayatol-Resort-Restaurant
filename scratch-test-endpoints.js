const mongoose = require("mongoose");
require("dotenv").config();

// We need to register the models
const StockMovementSchema = new mongoose.Schema({}, { strict: false });
const StockMovement = mongoose.models.StockMovement || mongoose.model("StockMovement", StockMovementSchema, "stockmovements");

const StockSchema = new mongoose.Schema({}, { strict: false });
const Stock = mongoose.models.Stock || mongoose.model("Stock", StockSchema, "stocks");

const IngredientSchema = new mongoose.Schema({}, { strict: false });
const Ingredient = mongoose.models.Ingredient || mongoose.model("Ingredient", IngredientSchema, "ingredients");

const MONGODB_URI = process.env.MONGODB_URI;

async function testKitchenIssue() {
  const matchQuery = { type: "kitchen_issue" };
  const pipeline = [
    { $match: matchQuery },
    {
      $lookup: {
        from: "stocks",
        localField: "stock",
        foreignField: "_id",
        as: "stockDetails",
      },
    },
    { $unwind: { path: "$stockDetails", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "ingredients",
        localField: "stockDetails.ingredient",
        foreignField: "_id",
        as: "ingredientDetails",
      },
    },
    { $unwind: { path: "$ingredientDetails", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "ingredientcategories",
        localField: "ingredientDetails.category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
  ];

  const countPipeline = [
    ...pipeline,
    {
      $group: {
        _id: { $ifNull: ["$batchId", { $toString: "$_id" }] }
      }
    },
    { $count: "total" }
  ];

  const dataPipeline = [
    ...pipeline,
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { $ifNull: ["$batchId", { $toString: "$_id" }] },
        batchId: { $first: { $ifNull: ["$batchId", { $toString: "$_id" }] } },
        createdAt: { $first: "$createdAt" },
        kitchenName: { $first: "$kitchenName" },
        createdBy: {
          $first: {
            _id: "$userDetails._id",
            name: "$userDetails.name"
          }
        },
        items: {
          $push: {
            _id: "$_id",
            adjustment: "$adjustment",
            beforeQuantity: "$beforeQuantity",
            afterQuantity: "$afterQuantity",
            note: "$note",
            ingredient: {
              _id: "$ingredientDetails._id",
              name: "$ingredientDetails.name",
              unit: "$ingredientDetails.unit",
              sku: "$ingredientDetails.sku",
              category: "$categoryDetails",
            },
            stock: { _id: "$stockDetails._id", quantityInStock: "$stockDetails.quantityInStock" },
          }
        }
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: 0 },
    { $limit: 10 }
  ];

  const [countResult, data] = await Promise.all([
    StockMovement.aggregate(countPipeline),
    StockMovement.aggregate(dataPipeline),
  ]);

  console.log("=== KITCHEN ISSUE ===");
  console.log("Total unique batches:", countResult[0]?.total || 0);
  console.log("Data count:", data.length);
  if (data.length > 0) {
    console.log("First record batchId:", data[0].batchId);
    console.log("First record items count:", data[0].items.length);
    console.log("First record items sample:", JSON.stringify(data[0].items[0], null, 2));
  }
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");
  await testKitchenIssue();
  await mongoose.disconnect();
}

run().catch(console.error);
