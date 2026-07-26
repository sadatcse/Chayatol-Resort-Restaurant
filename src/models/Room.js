import mongoose from "mongoose";
const { Schema } = mongoose;

const RoomSchema = Schema(
  {
    roomNumber: {
      type: String,
      required: [true, "Please provide the room number"],
      unique: true,
      trim: true,
    },
    roomType: {
      type: String,
      required: [true, "Please provide the room type"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Please provide the room price"],
      min: [0, "Price must be a positive number"],
    },
    priceWithBreakfast: {
      type: Number,
      default: 0,
      min: [0, "Price must be a positive number"],
    },
    priceWithAllDayFood: {
      type: Number,
      default: 0,
      min: [0, "Price must be a positive number"],
    },
    priceWithDayLong: {
      type: Number,
      default: 0,
      min: [0, "Price must be a positive number"],
    },
    capacity: {
      type: Number,
      required: [true, "Please provide the room capacity"],
      min: [1, "Capacity must be at least 1"],
    },
    status: {
      type: String,
      enum: ["Available", "Reserved", "Occupied", "Cleaning", "Maintenance", "Out Of Service"],
      default: "Available",
    },
    // ---- New fields added for future mechanism ----
    roomName: {
      type: String,
      trim: true,
    },
    roomView: {
      type: String,
      trim: true,
    },
    adultChild: {
      adult: { type: Number, default: 0 },
      child: { type: Number, default: 0 },
    },
    maxCapacity: {
      type: Number,
    },
    roomDetails: {
      type: String,
    },
    vat: {
      type: Number,
      default: 0,
    },
    smokingRoom: {
      type: Boolean,
      default: false,
    },
    roomCoverPhoto: {
      type: String,
    },
    roomDetailsPhoto: [{ type: String }],
  },
  { timestamps: true }
);

// Backs the default "Available" room lookup used by booking/check-in flows
// and the paginated room list's status filter — previously unindexed.
RoomSchema.index({ status: 1 });

const Room = mongoose.models.Room || mongoose.model("Room", RoomSchema);
export default Room;
