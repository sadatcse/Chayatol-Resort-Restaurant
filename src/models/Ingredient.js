import mongoose from "mongoose";
const { Schema } = mongoose;

const IngredientSchema = Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide an ingredient name"],
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "IngredientCategory",
      required: [true, "Please provide a category"],
    },
    unit: {
      type: String,
      required: [true, "Please provide a unit (e.g., kg, pcs, ltr)"],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, "Please provide a SKU"],
      trim: true,
    },
    stockAlert: {
      type: Number,
      default: 0,
      min: [0, "Stock alert cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Ingredient =
  mongoose.models.Ingredient ||
  mongoose.model("Ingredient", IngredientSchema);

export default Ingredient;
