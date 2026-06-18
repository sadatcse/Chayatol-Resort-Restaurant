import mongoose from "mongoose";
const { Schema } = mongoose;

const lostFoundCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const LostFoundCategory =
  mongoose.models.LostFoundCategory ||
  mongoose.model("LostFoundCategory", lostFoundCategorySchema);

export default LostFoundCategory;
