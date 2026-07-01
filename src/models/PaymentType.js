import mongoose from "mongoose";
const { Schema } = mongoose;

const PaymentTypeSchema = Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide the payment type name"],
      trim: true,
      unique: true,
    },
    image: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const PaymentType = mongoose.models.PaymentType || mongoose.model("PaymentType", PaymentTypeSchema);
export default PaymentType;
