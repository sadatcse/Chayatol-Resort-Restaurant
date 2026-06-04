import mongoose from "mongoose";
const { Schema } = mongoose;

const UserLogSchema = Schema(
  {
    userEmail: {
      type: String,
      required: [true, "Please provide the user email"],
    },
    username: {
      type: String,
    },
    loginTime: {
      type: Date,
    },
    logoutTime: {
      type: Date,
    },
    role: {
      type: String,
    },

  },
  { timestamps: true }
);

const UserLog = mongoose.models.UserLog || mongoose.model("UserLog", UserLogSchema);
export default UserLog;
