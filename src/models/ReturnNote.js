import mongoose from "mongoose";
const { Schema } = mongoose;

const returnNoteSchema = new Schema(
  {
    returnNumber: {
      type: String,
      required: [true, "Return number is required"],
      unique: true,
      trim: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      ref: "LostFoundItem",
      required: [true, "Item ID is required"],
    },
    claimId: {
      type: Schema.Types.ObjectId,
      ref: "LostFoundClaim",
      required: [true, "Claim ID is required"],
    },
    returnedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Returned by staff ID is required"],
    },
    returnedAt: {
      type: Date,
      default: Date.now,
    },
    customerSignature: {
      type: String,
      required: [true, "Customer signature is required"],
    },
    staffSignature: {
      type: String,
      required: [true, "Staff signature is required"],
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const ReturnNote =
  mongoose.models.ReturnNote ||
  mongoose.model("ReturnNote", returnNoteSchema);

export default ReturnNote;
