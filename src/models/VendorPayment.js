import mongoose from "mongoose";
const { Schema } = mongoose;

const VendorPaymentSchema = Schema(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor is required"],
    },
    purchase: {
      type: Schema.Types.ObjectId,
      ref: "Purchase",
      required: false, // Optional for bulk or direct account adjustments
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    purchaseDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["Cash", "Card", "Mobile", "Other"],
      default: "Cash",
    },
    note: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

// Clear model cache in Next.js dev server to prevent stale schemas
if (mongoose.models.VendorPayment) {
  delete mongoose.models.VendorPayment;
}

const VendorPayment = mongoose.models.VendorPayment || mongoose.model("VendorPayment", VendorPaymentSchema);
export default VendorPayment;
