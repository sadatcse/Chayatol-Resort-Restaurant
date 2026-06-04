import mongoose from "mongoose";
const { Schema } = mongoose;

const CompanySchema = Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide the company name"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Please provide the company phone number"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide the company email address"],
      unique: true,
      trim: true,
    },
    ownerEmail: {
      type: String,
      required: [true, "Please provide the owner's email address"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Please provide the company address"],
      trim: true,
    },
    logo: {
      type: String,
      default: "",
    },
    otherInformation: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    binNumber: {
      type: String,
      trim: true,
    },
    tinNumber: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Company = mongoose.models.Company || mongoose.model("Company", CompanySchema);
export default Company;
