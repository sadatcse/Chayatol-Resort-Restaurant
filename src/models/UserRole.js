import mongoose from "mongoose";
const { Schema } = mongoose;

const UserRoleSchema = Schema(
  {

    userrole: {
      type: String,
      required: [true, "Please provide the user role"],
    },
  },
  { timestamps: true }
);

const UserRole = mongoose.models.UserRole || mongoose.model("UserRole", UserRoleSchema);
export default UserRole;
