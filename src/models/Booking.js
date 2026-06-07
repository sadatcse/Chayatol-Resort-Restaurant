import mongoose from "mongoose";
const { Schema } = mongoose;

const BookingSchema = Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Please provide the customer ID"],
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Please provide the room ID"],
    },
    checkInDate: {
      type: Date,
      required: [true, "Please provide the check-in date"],
    },
    checkOutDate: {
      type: Date,
      required: [true, "Please provide the check-out date"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Please provide the total amount"],
      min: [0, "Total amount cannot be negative"],
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending",
    },
    bookingStatus: {
      type: String,
      enum: ["Confirmed", "Checked-in", "Checked-out", "Cancelled"],
      default: "Confirmed",
    },
  },
  { timestamps: true }
);

const Booking = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
export default Booking;
