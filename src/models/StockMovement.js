import mongoose from "mongoose";
const { Schema } = mongoose;

const StockMovementSchema = Schema(
  {
    stock: {
      type: Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
    },
    type: {
      type: String,
      enum: ["manual_adjustment", "purchase", "sale", "wastage"],
      default: "manual_adjustment",
    },
    beforeQuantity: {
      type: Number,
      required: true,
    },
    afterQuantity: {
      type: Number,
      required: true,
    },
    adjustment: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const StockMovement =
  mongoose.models.StockMovement ||
  mongoose.model("StockMovement", StockMovementSchema);

export default StockMovement;
