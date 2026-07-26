import mongoose from "mongoose";
const { Schema } = mongoose;

const TableReservationSchema = new Schema(
  {
    tableName: {
      type: String,
      required: [true, "Please select or provide a table name"],
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, "Please provide reservation start time"],
    },
    endTime: {
      type: Date,
      required: [true, "Please provide reservation end time"],
    },
    customerName: {
      type: String,
      required: [true, "Please provide the customer name"],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, "Please provide the customer phone number"],
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
    },
    additionalInfo: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Seated", "Cancelled", "No Show"],
      default: "Pending",
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    bookedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    }
  },
  { timestamps: true }
);

const TableReservation = mongoose.models.TableReservation || mongoose.model("TableReservation", TableReservationSchema);
export default TableReservation;
