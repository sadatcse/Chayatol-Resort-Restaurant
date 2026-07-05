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

    tableName: {
      type: String,
      default: null,
    },

    roomNo: {
      type: String,
      default: null,
    },

    deliveryProvider: {
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

    deliveryCharge: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
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

    // --- NEW: Added fields for Teaxo POS & Kitchen Display compatibility ---
    products: [
      {
        productId: String,
        productName: String,
        qty: { type: Number, default: 0 },
        printedQty: { type: Number, default: 0 },
        addedInRound: { type: Number, default: 1 },
        rate: { type: Number, default: 0 },
        subtotal: { type: Number, default: 0 },
        vat: { type: Number, default: 0 },
        sd: { type: Number, default: 0 },
        cookStatus: { type: String, default: "PENDING" },
        isComplimentary: { type: Boolean, default: false },
        drinkBar: { type: Boolean, default: false },
        cookOn: { type: String, default: "MAIN KITCHEN" },
        history: [
          {
            updateNumber: { type: Number, default: 0 },
            updateTime: { type: Date, default: Date.now },
            cookStatus: { type: String, default: "PENDING" },
            qty: { type: Number, default: 0 }
          }
        ]
      }
    ],
    invoiceSerial: { type: String, default: null },
    dateTime: { type: Date, default: Date.now },
    customerName: { type: String, default: "" },
    customerMobile: { type: String, default: "" },
    kotRound: { type: Number, default: 1 },
    orderStatus: { type: String, default: "pending" },

    loginUserName: {
      type: String,
      default: null,
    },

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
