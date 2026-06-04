import mongoose from "mongoose";
const { Schema } = mongoose;

const ExpenseCategorySchema = Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide the expense category name"],
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const ExpenseCategory = mongoose.models.ExpenseCategory || mongoose.model("ExpenseCategory", ExpenseCategorySchema);
export default ExpenseCategory;
