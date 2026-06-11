import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const { Schema } = mongoose;

const UserSchema = Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide user name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
    },
    photo: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      required: [true, "Please provide mobile number"],
    },
    department: {
      type: String,
      required: [true, "Please provide department name"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "on-leave"],
      default: "active",
    },

  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    if (typeof next === "function") next();
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  if (typeof next === "function") next();
});

UserSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
