import mongoose from "mongoose";
const { Schema } = mongoose;

const lostFoundNotificationSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["ITEM_CREATED", "CLAIM_SUBMITTED", "CLAIM_APPROVED", "ITEM_RETURNED", "EXPIRY_WARNING"],
      required: [true, "Notification type is required"],
    },
    read: {
      type: Boolean,
      default: false,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "LostFoundItem",
    },
  },
  { timestamps: true }
);

const LostFoundNotification =
  mongoose.models.LostFoundNotification ||
  mongoose.model("LostFoundNotification", lostFoundNotificationSchema);

export default LostFoundNotification;
