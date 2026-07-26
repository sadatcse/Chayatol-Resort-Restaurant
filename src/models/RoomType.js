import mongoose from "mongoose";
const { Schema } = mongoose;

const RoomTypeSchema = Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide the room type name"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const RoomType = mongoose.models.RoomType || mongoose.model("RoomType", RoomTypeSchema);
export default RoomType;
