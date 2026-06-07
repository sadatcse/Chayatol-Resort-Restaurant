import mongoose from "mongoose";
const { Schema } = mongoose;

const FoodSchema = Schema(
  {
    foodName: {
      type: String,
      required: [true, "Please provide the food name"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Please provide the food category"],
    },
    foodType: {
      type: String,
      enum: ["Veg", "Non-Veg", "Beverage", "Dessert", "Other"],
      default: "Non-Veg",
    },
    details: {
      type: String,
      trim: true,
    },
    image: {
      type: String, // URL of the image
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Please provide the food price"],
      min: [0, "Price must be a positive number"],
    },
    status: {
      type: String,
      enum: ["Available", "Unavailable"],
      default: "Available",
    },
    vat: {
      type: Number,
      default: 0,
      min: [0, "VAT cannot be negative"],
    },
    sd: {
      type: Number,
      default: 0,
      min: [0, "SD cannot be negative"],
    },
  },
  { timestamps: true }
);

if (mongoose.models.Food) {
  delete mongoose.models.Food;
}
const Food = mongoose.model("Food", FoodSchema);
export default Food;
