import mongoose from "mongoose";
const { Schema } = mongoose;

const StayRoomSchema = Schema({
  room: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true
  },
  mealPlan: {
    type: String,
    enum: ["Room Only", "Breakfast Included", "All-Day Food Included"],
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

if (mongoose.models.Stay) {
  delete mongoose.models.Stay;
}

const Stay = mongoose.model("Stay", StaySchema);
export default Stay;
