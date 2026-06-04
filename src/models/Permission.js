import mongoose from "mongoose";
const { Schema } = mongoose;

const permissionSchema = new Schema(
  {
    title: { type: String, required: true },
    isAllowed: { type: Boolean, required: true },
    role: { type: String, required: true },
    group_name: { type: String, required: true },
    path: { type: String, required: true },
  },
  { timestamps: true }
);

permissionSchema.index({ role: 1, path: 1 }, { unique: true });

const Permission = mongoose.models.Permission || mongoose.model("Permission", permissionSchema);
export default Permission;
