import mongoose from "mongoose";
const { Schema } = mongoose;

const invoiceSchema = new Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
    },

    orderType: {
      type: String,
      enum: ["Dine In", "Takeaway", "Delivery", "Room Service", "Foodpanda", "Foodi", "Pathao"],
      required: true,
    },

    customer: {
      name: String,
      phone: String,
      email: String,
      address: String, // useful for delivery
    },

    tableNo: {
      type: String,
      default: null,
    },

    roomNo: {
      type: String,
      default: null,
    },

    waiterName: {
      type: String,
      default: null,
    },

    guestCount: {
      type: Number,
      default: 1,
    },

    orderBatches: [
      {
        batchId: String,

        orderedAt: Date,

        orderedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },

        items: [
          {
            itemName: String,
            category: String,
            quantity: Number,
            unitPrice: Number,
            totalPrice: Number,
            orderStatus: {
              type: String,
              enum: [
                "Pending",
                "Cooking",
                "Ready",
                "Served",
                "Cancelled",
              ],
              default: "Pending",
            },
          },
        ],
      },
    ],

    subTotal: {
      type: Number,
      required: true,
    },

    discount: {
      type: Number,
      default: 0,
    },

    vat: {
      type: Number,
      default: 0,
    },

    sd: {
      type: Number,
      default: 0,
    },

    serviceCharge: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: [
        "Cash",
        "Card",
        "Mobile Banking",
        "Bank Transfer",
        "Room Charge"
      ],
      default: "Cash",
    },

    paymentStatus: {
      type: String,
      enum: ["Paid", "Partial", "Unpaid"],
      default: "Unpaid",
    },

    invoiceType: {
      type: String,
      enum: ["Restaurant", "Hotel", "Resort"],
      default: "Restaurant"
    },

    notes: String,

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, // temporarily false so POS can create anonymously if user context missing
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Invoice) {
  delete mongoose.models.Invoice;
}

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
