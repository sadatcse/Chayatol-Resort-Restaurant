import mongoose from "mongoose";
const { Schema } = mongoose;

const TransactionLogSchema = new Schema(
  {
    transactionType: {
      type: String,
      required: [true, "Transaction type is required"],
    },
    transactionCode: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    details: {
      type: String,
    },
    message: {
      type: String,
      default: null,
    },
    stackTrace: {
      type: String,
      default: null,
    },
    transactionTime: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const TransactionLog = mongoose.models.TransactionLog || mongoose.model("TransactionLog", TransactionLogSchema);
export default TransactionLog;
