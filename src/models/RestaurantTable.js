import mongoose from "mongoose";
const { Schema } = mongoose;

const RestaurantTableSchema = Schema(
  {
    tableName: {
      type: String,
      required: [true, "Please provide the restaurant table name"],
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const RestaurantTable = mongoose.models.RestaurantTable || mongoose.model("RestaurantTable", RestaurantTableSchema);
export default RestaurantTable;
