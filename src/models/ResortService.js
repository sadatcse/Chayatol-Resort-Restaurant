import mongoose from "mongoose";

const resortServiceSchema = new mongoose.Schema(
  {
    serviceName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    vat: {
      type: Number,
      default: 0,
    },
    sc: {
      type: Number,
      default: 0,
    },
    sd: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Available", "Unavailable"],
      default: "Available",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ResortService ||
  mongoose.model("ResortService", resortServiceSchema);
