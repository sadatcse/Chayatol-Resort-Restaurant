import mongoose from "mongoose";
const { Schema } = mongoose;

const lostFoundLocationSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Location name is required"],
      trim: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["Room", "Lobby", "Reception", "Pool", "Restaurant", "Parking", "Others"],
      default: "Others",
    },
    description: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const LostFoundLocation =
  mongoose.models.LostFoundLocation ||
  mongoose.model("LostFoundLocation", lostFoundLocationSchema);

export default LostFoundLocation;
