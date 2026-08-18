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
    },
    // Lets the POST route recognize a retried request (e.g. a slow-network
    // double-click) and return the original order instead of creating a
    // duplicate order + folio charge. Mirrors Stay.js's idempotencyKey.
    idempotencyKey: {
      type: String,
      default: null,
      index: {
        unique: true,
        sparse: true,
        partialFilterExpression: { idempotencyKey: { $type: "string" } }
      }
    }
  },
  { timestamps: true }
);

const ServiceOrder = mongoose.models.ServiceOrder || mongoose.model("ServiceOrder", ServiceOrderSchema);
export default ServiceOrder;
