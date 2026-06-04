import mongoose from "mongoose";
const { Schema } = mongoose;

const CategorySchema = Schema(
  {
    categoryName: {
      type: String,
      required: [true, "Please provide the category name"],
      trim: true,
    },
    serial: {
      type: Number,
      required: [true, "Please provide the display serial number"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
export default Category;
