import mongoose from "mongoose";
const { Schema } = mongoose;

const VenueBookingSchema = new Schema(
  {
    bookingNumber: {
      type: String,
      required: [true, "Booking number is required"],
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Please provide the customer ID"],
    },
    companyName: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Please provide the start date"],
    },
    endDate: {
      type: Date,
      required: [true, "Please provide the end date"],
    },
    startTime: {
      type: String,
      default: "08:00",
    },
    endTime: {
      type: String,
      default: "22:00",
    },
    venueSize: {
      type: String,
      enum: ["Full Venue", "Half Venue"],
      default: "Full Venue",
      required: true,
    },
    pricingType: {
      type: String,
      default: "Full Day",
      required: true,
    },
    rateApplied: {
      type: Number,
      required: [true, "Please provide the rate applied"],
      min: [0, "Rate cannot be negative"],
    },
    duration: {
      type: Number,
      required: [true, "Please provide the duration"],
      min: [1, "Duration must be at least 1"],
    },
    durationUnit: {
      type: String,
      enum: ["Hours", "Days"],
      default: "Days",
      required: true,
    },
    eventTitle: {
      type: String,
      required: [true, "Please provide the event title"],
      trim: true,
    },
    numberOfGuests: {
      type: Number,
      default: 0,
    },
    numberOfRooms: {
      type: Number,
      default: 0,
      min: [0, "Number of rooms cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Please provide the total amount"],
      min: [0, "Total amount cannot be negative"],
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, "Paid amount cannot be negative"],
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid"],
      default: "Unpaid",
    },
    paymentMethod: {
      type: String,
      default: "Cash",
    },
    bookingStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled"],
      default: "Confirmed",
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    specialInstructions: {
      type: String,
      trim: true,
    },
    createdByUser: {
      type: String,
      default: "System",
    },
  },
  { timestamps: true }
);

if (mongoose.models.VenueBooking) {
  delete mongoose.models.VenueBooking;
}

const VenueBooking = mongoose.model("VenueBooking", VenueBookingSchema);
export default VenueBooking;
