import mongoose from "mongoose";
const { Schema } = mongoose;

const VendorSchema = Schema(
  {
    vendorID: {
      type: String,
      required: [true, "Please provide a Vendor ID"],
      unique: true,
      trim: true,
    },
    vendorName: {
      type: String,
      required: [true, "Please provide a vendor name"],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    primaryPhone: {
      type: String,
      required: [true, "Please provide a primary phone number"],
      trim: true,
    },
    primaryEmail: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    contactPersonName: {
      type: String,
      trim: true,
    },
    contactPersonPhone: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Vendor = mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);

export default Vendor;
