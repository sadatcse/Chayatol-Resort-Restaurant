import mongoose from "mongoose";
const { Schema } = mongoose;

const RecurringExpenseSchema = new Schema(
  {
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
      required: [true, "Please provide the amount"],
      min: [0, "Amount cannot be negative"],
    },
    paymentMethod: {
      type: String,
      required: [true, "Please select a payment method"],
      default: "Cash",
    },
    vendor: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    frequency: {
      type: String,
      required: [true, "Please specify the billing frequency"],
      enum: ["Daily", "Weekly", "Monthly", "Yearly"],
      default: "Monthly",
    },
    startDate: {
      type: Date,
      required: [true, "Please select a start date"],
      default: Date.now,
    },
    nextDueDate: {
      type: Date,
      required: [true, "Please specify the next due date"],
    },
    status: {
      type: String,
      required: [true, "Please select a status"],
      enum: ["Active", "Inactive"],
      default: "Active",
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
if (mongoose.models.RecurringExpense) {
  delete mongoose.models.RecurringExpense;
}

const RecurringExpense = mongoose.model("RecurringExpense", RecurringExpenseSchema);
export default RecurringExpense;
