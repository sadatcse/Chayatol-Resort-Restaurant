import mongoose from "mongoose";
const { Schema } = mongoose;

const FolioEntrySchema = Schema(
  {
    stayId: {
      type: Schema.Types.ObjectId,
      ref: "Stay",
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ["Room Charge", "Advance Payment", "Food Charge", "Service Charge", "Tax/VAT Charge", "Adjustment", "Payment", "Discount"],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    debit: {
      type: Number,
      default: 0
    },
    credit: {
      type: Number,
      default: 0
    },
    referenceId: {
      type: Schema.Types.ObjectId
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    staffName: {
      type: String,
      trim: true
    },
    // Lets Payment/Discount POST routes recognize a retried request (e.g. a
    // slow-network double-click) and return the original entry instead of
    // creating a duplicate charge/credit. Mirrors Stay.js's idempotencyKey.
    idempotencyKey: {
      type: String,
      default: null,
      index: {
        unique: true,
        sparse: true,
        partialFilterExpression: { idempotencyKey: { $type: "string" } }
      }
    }
  },
  { timestamps: true }
);

const FolioEntry = mongoose.models.FolioEntry || mongoose.model("FolioEntry", FolioEntrySchema);
export default FolioEntry;
