import mongoose from "mongoose";
const { Schema } = mongoose;

const IngredientCategorySchema = Schema(
  {
    categoryName: {
      type: String,
      required: [true, "Please provide a category name"],
      trim: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const IngredientCategory =
  mongoose.models.IngredientCategory ||
  mongoose.model("IngredientCategory", IngredientCategorySchema);

export default IngredientCategory;
