import mongoose from "mongoose";

const resortServiceCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ResortServiceCategory ||
  mongoose.model("ResortServiceCategory", resortServiceCategorySchema);
