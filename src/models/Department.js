import mongoose from "mongoose";
const { Schema } = mongoose;

const DepartmentSchema = Schema(
  {

    department: {
      type: String,
      required: [true, "Please provide the department name"],
    },
  },
  { timestamps: true }
);

const Department = mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
export default Department;
