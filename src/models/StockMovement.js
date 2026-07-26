import mongoose from "mongoose";
const { Schema } = mongoose;

const StockMovementSchema = Schema(
  {
    stock: {
      type: Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
    },
    ingredient: {
      type: Schema.Types.ObjectId,
      ref: "Ingredient",
    },
    type: {
      type: String,
      enum: [
        "manual_adjustment",
        "purchase",
        "sale",
        "wastage",
        "kitchen_issue",
        "room_issue",
        "return_kitchen",
        "return_room",
      ],
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
    // Wastage specific
    reason: {
      type: String,
      trim: true,
    },
    // Kitchen Issue specific
    kitchenName: {
      type: String,
      trim: true,
    },
    // Room Issue specific
    roomNumber: {
      type: String,
      trim: true,
    },
    guestName: {
      type: String,
      trim: true,
    },
    // For returns — link back to original issue movement
    referenceId: {
      type: Schema.Types.ObjectId,
      ref: "StockMovement",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    batchId: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes for ledger queries
StockMovementSchema.index({ stock: 1, createdAt: -1 });
StockMovementSchema.index({ ingredient: 1, createdAt: -1 });
StockMovementSchema.index({ type: 1 });

const StockMovement = mongoose.models.StockMovement || mongoose.model("StockMovement", StockMovementSchema);

export default StockMovement;
