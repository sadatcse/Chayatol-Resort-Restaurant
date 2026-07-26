import mongoose from "mongoose";
const { Schema } = mongoose;

const VenuePricingSchema = new Schema(
  {
    pricingType: {
      type: String,
      required: [true, "Pricing type name is required"],
      unique: true,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Please provide the price"],
      min: [0, "Price cannot be negative"],
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const VenuePricing = mongoose.models.VenuePricing || mongoose.model("VenuePricing", VenuePricingSchema);
export default VenuePricing;
