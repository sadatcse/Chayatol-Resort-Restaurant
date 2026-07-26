import mongoose from "mongoose";
const { Schema } = mongoose;

const ServiceOrderSchema = Schema(
  {
    stayId: {
      type: Schema.Types.ObjectId,
      ref: "Stay",
      required: true
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: "ResortService",
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    vat: {
      type: Number,
      default: 0
    },
    sc: {
      type: Number,
      default: 0
    },
    sd: {
      type: Number,
      default: 0
    },
    isChargeable: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const ServiceOrder = mongoose.models.ServiceOrder || mongoose.model("ServiceOrder", ServiceOrderSchema);
export default ServiceOrder;
