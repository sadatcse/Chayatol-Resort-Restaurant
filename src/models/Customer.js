import mongoose from "mongoose";
const { Schema } = mongoose;

const CustomerSchema = Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please provide the customer full name"],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Please provide the customer phone number"],
      trim: true,
      unique: true,
    },
    emailAddress: {
      type: String,
      trim: true,
    },
    nationality: {
      type: String,
      default: "Bangladeshi",
      trim: true,
    },
    maritalStatus: {
      type: String,
      required: [true, "Please provide the marital status"],
      enum: ["Single", "Married", "Divorced", "Widowed", "Other"],
    },
    gender: {
      type: String,
      required: [true, "Please provide the gender"],
      enum: ["Male", "Female", "Other"],
    },
    dateOfBirth: {
      type: Date,
    },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      division: { type: String, trim: true },
      country: { type: String, trim: true, default: "Bangladesh" },
    },
    occupation: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    anniversaryDate: {
      type: Date,
    },
    identificationType: {
      type: String,
      enum: ["NID", "Passport", "Driving License", "Birth Certificate", "Other"],
      default: "NID",
    },
    identificationNumber: {
      type: String,
      trim: true,
    },
    uploadIdCopy: {
      type: String,
      default: "",
    },
    customerPhoto: {
      type: String,
      default: "",
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phoneNumber: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

const Customer = mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
export default Customer;
