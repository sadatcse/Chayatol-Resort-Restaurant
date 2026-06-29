import mongoose from "mongoose";
const { Schema } = mongoose;

const ExpenseSchema = new Schema(
  {
    expenseDate: {
      type: Date,
      required: [true, "Please provide the expense date"],
      default: Date.now,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: [true, "Please select an expense category"],
    },
    subcategory: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Please provide the expense amount"],
      min: [0, "Expense amount cannot be negative"],
    },
    paymentMethod: {
      type: String,
      required: [true, "Please select a payment method"],
      default: "Cash",
    },
    referenceNo: {
      type: String,
      trim: true,
    },
    vendor: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    attachment: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Clear model cache in Next.js dev server to prevent stale schemas
if (mongoose.models.Expense) {
  delete mongoose.models.Expense;
}

const Expense = mongoose.model("Expense", ExpenseSchema);
export default Expense;
