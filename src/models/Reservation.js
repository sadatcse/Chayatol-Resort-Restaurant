import mongoose from "mongoose";
const { Schema } = mongoose;

const ReservationRoomSchema = Schema({
  roomType: {
    type: String,
    required: true
  },
  room: {
    type: Schema.Types.ObjectId,
    ref: "Room"
  },
  adults: {
    type: Number,
    required: true,
    min: 1
  },
  children: {
    type: Number,
    default: 0,
    min: 0
  },
  mealPlan: {
    type: String,
    enum: ["Room Only", "Breakfast Included", "All-Day Food Included", "Day-Long Included"],
    default: "Room Only"
  },
  nightlyRate: {
    type: Number,
    required: true
  },
  nights: {
    type: Number,
    required: true,
    min: 1
  }
});

const ReservationSchema = Schema(
  {
    reservationNo: {
      type: String,
      required: true,
      unique: true
    },
    bookingDate: {
      type: Date,
      default: Date.now
    },
    checkInDate: {
      type: Date,
      required: [true, "Please provide the check-in date"]
    },
    checkOutDate: {
      type: Date,
      required: [true, "Please provide the check-out date"]
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Please provide the customer"]
    },
    bookingSource: {
      type: String,
      enum: ["Website", "Phone", "Agent", "Walk-in"],
      default: "Walk-in"
    },
    status: {
      type: String,
      enum: ["Draft", "Confirmed", "Partially Paid", "Fully Paid", "Checked-In", "Cancelled", "No Show", "Completed"],
      default: "Draft"
    },
    rooms: [ReservationRoomSchema],
    notes: {
      type: String
    },
    cancellationFee: {
      type: Number,
      default: 0
    },
    cancellationReason: {
      type: String
    },
    idempotencyKey: {
      type: String,
      default: null,
      index: {
        unique: true,
        sparse: true,
        partialFilterExpression: { idempotencyKey: { $type: "string" } }
      }
    }
  },
  { timestamps: true }
);

// Backs the status filter and check-in date range queries used by the
// reservations list, dashboard, and front-desk timeline — previously
// unindexed full collection scans.
ReservationSchema.index({ status: 1 });
ReservationSchema.index({ checkInDate: 1 });

const Reservation = mongoose.models.Reservation || mongoose.model("Reservation", ReservationSchema);
export default Reservation;
