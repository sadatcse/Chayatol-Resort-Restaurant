import mongoose from "mongoose";

const controlSettingsSchema = new mongoose.Schema({
  dailyReport: { type: Boolean, default: false },
  printKOT: { type: Boolean, default: false },
  sendOnlineOrderSMS: { type: Boolean, default: false },
  sendInvoiceSMS: { type: Boolean, default: false },
  timeZone: { type: String, default: "Asia/Dhaka" },
  checkInTime: { type: String, default: "14:00" },
  checkOutTime: { type: String, default: "12:00" }
}, {
  timestamps: true
});

const ControlSettings = mongoose.models.ControlSettings || mongoose.model("ControlSettings", controlSettingsSchema);

export default ControlSettings;
