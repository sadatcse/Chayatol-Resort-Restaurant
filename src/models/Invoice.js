import mongoose from "mongoose";
const { Schema } = mongoose;

const invoiceSchema = new Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
    },

    customer: {
      name: String,
      phone: String,
    },

    items: [
      {
        itemName: {
          type: String,
          required: true,
        },

        category: {
          type: String,
          enum: ["Food", "Drink", "Room Service", "Accommodation", "Other"],
          default: "Food",
        },

        quantity: {
          type: Number,
          required: true,
        },

        unitPrice: {
          type: Number,
          required: true,
        },

        totalPrice: {
          type: Number,
          required: true,
        },
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
      enum: ["Cash", "Card", "Mobile Banking", "Bank Transfer", "Room Charge"],
      default: "Cash",
    },

    paymentStatus: {
      type: String,
      enum: ["Paid", "Partial", "Unpaid"],
      default: "Paid",
    },

    invoiceType: {
      type: String,
      enum: ["Restaurant", "Hotel", "Resort"],
      required: true,
    },

    // Additional Production-grade Fields
    branchId: {
      type: String,
    },
    tableNo: {
      type: String,
    },
    roomNo: {
      type: String,
    },
    checkInDate: {
      type: Date,
    },
    checkOutDate: {
      type: Date,
    },
    guestCount: {
      type: Number,
      default: 1,
    },
    orderSource: {
      type: String,
      enum: ["Dine In", "Takeaway", "Room Service", "Delivery"],
      default: "Dine In",
    },
    transactionId: {
      type: String,
    },
    notes: {
      type: String,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
