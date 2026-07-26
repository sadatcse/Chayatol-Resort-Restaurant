import mongoose from "mongoose";
const { Schema } = mongoose;

const permissionSchema = new Schema(
  {
    title: { type: String, required: true },
    isAllowed: { type: Boolean, default: false },
    role: { type: String, required: true },
    group_name: { type: String, required: true },
    path: { type: String, required: true },
    canView: { type: Boolean, default: false },
    canAdd: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

permissionSchema.index({ role: 1, path: 1 }, { unique: true });

const Permission = mongoose.models.Permission || mongoose.model("Permission", permissionSchema);
export default Permission;
