import mongoose from "mongoose";
const { Schema } = mongoose;

const FoodOrderItemSchema = Schema({
  foodItem: {
    type: Schema.Types.ObjectId,
    ref: "Food",
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
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
  }
});

const FoodOrderSchema = Schema(
  {
    stayId: {
      type: Schema.Types.ObjectId,
      ref: "Stay",
      required: true
    },
    items: [FoodOrderItemSchema],
    isChargeable: {
      type: Boolean,
      default: true
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Served", "Cancelled"],
      default: "Served"
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

const FoodOrder = mongoose.models.FoodOrder || mongoose.model("FoodOrder", FoodOrderSchema);
export default FoodOrder;
