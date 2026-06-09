import mongoose from "mongoose";

const controlSettingsSchema = new mongoose.Schema({
  dailyReport: { type: Boolean, default: false },
  printKOT: { type: Boolean, default: false },
  sendOnlineOrderSMS: { type: Boolean, default: false },
  sendInvoiceSMS: { type: Boolean, default: false },
  timeZone: { type: String, default: "Asia/Dhaka" }
}, {
  timestamps: true
});

const ControlSettings = mongoose.models.ControlSettings || mongoose.model("ControlSettings", controlSettingsSchema);

export default ControlSettings;
