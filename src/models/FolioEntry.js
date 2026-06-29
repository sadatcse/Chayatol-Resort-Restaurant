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
    }
  },
  { timestamps: true }
);

if (mongoose.models.FolioEntry) {
  delete mongoose.models.FolioEntry;
}

const FolioEntry = mongoose.model("FolioEntry", FolioEntrySchema);
export default FolioEntry;
