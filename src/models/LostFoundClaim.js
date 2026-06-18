import mongoose from "mongoose";
const { Schema } = mongoose;

const lostFoundClaimSchema = new Schema(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "LostFoundItem",
      required: [true, "Item ID is required"],
    },
    claimantName: {
      type: String,
      required: [true, "Claimant name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    nidPassport: {
      type: String,
      default: "",
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
    },
    roomNumber: {
      type: String,
      default: "",
    },
    verificationNotes: {
      type: String,
      default: "",
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: {
      type: Date,
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const LostFoundClaim =
  mongoose.models.LostFoundClaim ||
  mongoose.model("LostFoundClaim", lostFoundClaimSchema);

export default LostFoundClaim;
