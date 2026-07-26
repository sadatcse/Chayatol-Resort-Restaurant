import mongoose from "mongoose";
const { Schema } = mongoose;

const PurchaseItemSchema = Schema({
  ingredient: {
    type: Schema.Types.ObjectId,
    ref: "Ingredient",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, "Quantity cannot be negative"],
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, "Unit price cannot be negative"],
  },
  totalPrice: {
    type: Number,
    required: true,
  },
});

const PaymentHistorySchema = Schema({
  amount: {
    type: Number,
    required: true,
    min: [0, "Payment amount cannot be negative"],
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    default: "Cash",
  },
  note: {
    type: String,
    trim: true,
  }
});

const PurchaseSchema = Schema(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    items: [PurchaseItemSchema],
    grandTotal: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["Paid", "Unpaid", "Partial"],
      default: "Unpaid",
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      required: [true, "Please provide a payment method"],
      default: "Cash",
    },
    notes: {
      type: String,
      trim: true,
    },
    payments: [PaymentHistorySchema],
  },
  { timestamps: true }
);

// Clear model cache in Next.js dev server to prevent stale schemas
const Purchase = mongoose.models.Purchase || mongoose.model("Purchase", PurchaseSchema);

export default Purchase;
