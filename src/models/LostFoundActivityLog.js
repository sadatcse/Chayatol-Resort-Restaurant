import mongoose from "mongoose";
const { Schema } = mongoose;

const lostFoundActivityLogSchema = new Schema(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "LostFoundItem",
    },
    action: {
      type: String,
      required: [true, "Action is required"],
      trim: true,
    },
    oldValue: {
      type: Schema.Types.Mixed,
    },
    newValue: {
      type: Schema.Types.Mixed,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Performed by user ID is required"],
    },
    ipAddress: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const LostFoundActivityLog =
  mongoose.models.LostFoundActivityLog ||
  mongoose.model("LostFoundActivityLog", lostFoundActivityLogSchema);

export default LostFoundActivityLog;
