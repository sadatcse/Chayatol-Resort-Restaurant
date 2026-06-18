import mongoose from "mongoose";
const { Schema } = mongoose;

const lostFoundItemSchema = new Schema(
  {
    itemCode: {
      type: String,
      required: [true, "Item code is required"],
      unique: true,
      trim: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "LostFoundCategory",
      required: [true, "Category ID is required"],
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    brand: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "",
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity cannot be less than 1"],
    },
    estimatedValue: {
      type: Number,
      default: 0,
    },
    foundAt: {
      type: Date,
      default: Date.now,
    },
    foundLocationId: {
      type: Schema.Types.ObjectId,
      ref: "LostFoundLocation",
      required: [true, "Found location ID is required"],
    },
    roomId: {
      type: String,
      default: "",
    },
    foundBy: {
      type: String,
      required: [true, "Found by staff is required"],
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },
    storageLocationId: {
      type: Schema.Types.ObjectId,
      ref: "LostFoundLocation",
    },
    lockerNumber: {
      type: String,
      default: "",
    },
    shelfNumber: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },
    notes: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    video: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "FOUND",
        "STORED",
        "CLAIM_REQUESTED",
        "UNDER_VERIFICATION",
        "APPROVED",
        "RETURNED",
        "EXPIRED",
        "DISPOSED",
        "ARCHIVED",
      ],
      default: "FOUND",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const LostFoundItem =
  mongoose.models.LostFoundItem ||
  mongoose.model("LostFoundItem", lostFoundItemSchema);

export default LostFoundItem;
