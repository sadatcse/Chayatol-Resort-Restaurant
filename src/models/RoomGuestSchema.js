import mongoose from "mongoose";
const { Schema } = mongoose;

// Embedded (not registered as its own model) so ReservationRoomSchema and
// StayRoomSchema share one guest-entry shape instead of drifting apart.
const RoomGuestSchema = Schema({
  customer: {
    type: Schema.Types.ObjectId,
    ref: "Customer",
    required: true
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  relationToPrimary: {
    type: String,
    trim: true,
    default: ""
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

export default RoomGuestSchema;
