import mongoose from "mongoose";
const { Schema } = mongoose;

const StockSchema = Schema(
  {
    ingredient: {
      type: Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
      unique: true,
    },
    quantityInStock: {
      type: Number,
      required: true,
      default: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index on ingredient ID
StockSchema.index({ ingredient: 1 }, { unique: true });

const Stock = mongoose.models.Stock || mongoose.model("Stock", StockSchema);

export default Stock;
