import mongoose from "mongoose";

const chargeSettingsSchema = new mongoose.Schema({
  vat: {
    enabled: { type: Boolean, default: true },
    value: { type: Number, default: 5 },
    customApplicability: { type: Boolean, default: false },
    applicability: {
      "Dine In": { type: Boolean, default: true },
      "Takeaway": { type: Boolean, default: true },
      "Delivery": { type: Boolean, default: true },
      "Room Service": { type: Boolean, default: true },
      "Foodpanda": { type: Boolean, default: false },
      "Foodi": { type: Boolean, default: false },
      "Pathao": { type: Boolean, default: false },
    }
  },
  sc: {
    enabled: { type: Boolean, default: true },
    value: { type: Number, default: 0 },
    customApplicability: { type: Boolean, default: false },
    applicability: {
      "Dine In": { type: Boolean, default: true },
      "Takeaway": { type: Boolean, default: true },
      "Delivery": { type: Boolean, default: true },
      "Room Service": { type: Boolean, default: true },
      "Foodpanda": { type: Boolean, default: false },
      "Foodi": { type: Boolean, default: false },
      "Pathao": { type: Boolean, default: false },
    }
  },
  sd: {
    enabled: { type: Boolean, default: true },
    value: { type: Number, default: 0 },
    customApplicability: { type: Boolean, default: false },
    applicability: {
      "Dine In": { type: Boolean, default: true },
      "Takeaway": { type: Boolean, default: true },
      "Delivery": { type: Boolean, default: true },
      "Room Service": { type: Boolean, default: true },
      "Foodpanda": { type: Boolean, default: false },
      "Foodi": { type: Boolean, default: false },
      "Pathao": { type: Boolean, default: false },
    }
  },
  deliveryCharge: {
    enabled: { type: Boolean, default: false },
    type: { type: String, enum: ["FLAT", "PERCENT"], default: "FLAT" },
    value: { type: Number, default: 0 }
  }
}, { timestamps: true });

if (mongoose.models.ChargeSettings) {
  delete mongoose.models.ChargeSettings;
}
export default mongoose.model("ChargeSettings", chargeSettingsSchema);
