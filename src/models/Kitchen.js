import mongoose from "mongoose";
const { Schema } = mongoose;

const KitchenSchema = Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide the kitchen name"],
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Kitchen = mongoose.models.Kitchen || mongoose.model("Kitchen", KitchenSchema);
export default Kitchen;
