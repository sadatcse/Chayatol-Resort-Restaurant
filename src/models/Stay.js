import mongoose from "mongoose";
import RoomGuestSchema from "./RoomGuestSchema";
const { Schema } = mongoose;

const StayRoomSchema = Schema({
  room: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true
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
  adults: {
    type: Number,
    required: true
  },
  children: {
    type: Number,
    default: 0
  },
  guests: {
    type: [RoomGuestSchema],
    default: []
  }
});

const StaySchema = Schema(
  {
    stayNo: {
      type: String,
      required: true,
      unique: true
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: "Reservation"
    },
    rooms: [StayRoomSchema],
    checkInDate: {
      type: Date,
      required: true
    },
    expectedCheckOutDate: {
      type: Date,
      required: true
    },
    actualCheckOutDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ["In House", "Checked Out", "Extended", "Cancelled"],
      default: "In House"
    },
    notes: {
      type: String
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    staffName: {
      type: String,
      trim: true
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

// Backs the "In House" status lookups used throughout POS/room-service and
// checkout, the reservation<->stay conversion lookup, and the front-desk
// timeline's check-in/check-out date range queries — previously unindexed.
StaySchema.index({ status: 1 });
StaySchema.index({ reservationId: 1 });
StaySchema.index({ checkInDate: 1, actualCheckOutDate: 1 });

const Stay = mongoose.models.Stay || mongoose.model("Stay", StaySchema);
export default Stay;
