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

if (mongoose.models.RoomType) {
  delete mongoose.models.RoomType;
}

const RoomType = mongoose.model("RoomType", RoomTypeSchema);
export default RoomType;
