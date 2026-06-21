import mongoose from "mongoose";
const { Schema } = mongoose;

const ReservationPaymentSchema = Schema(
  {
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: "Reservation",
      required: true
    },
    paymentType: {
      type: String,
      required: [true, "Please provide the payment type"]
    },
    amount: {
      type: Number,
      required: [true, "Please provide the payment amount"]
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    transactionRef: {
      type: String,
      trim: true
    },
    notes: {
      type: String
    },
    receivedBy: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

if (mongoose.models.ReservationPayment) {
  delete mongoose.models.ReservationPayment;
}

const ReservationPayment = mongoose.model("ReservationPayment", ReservationPaymentSchema);
export default ReservationPayment;
