import mongoose from "mongoose";
const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, "Customer phone number is required"],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, "Feedback comment is required"],
      trim: true,
    },
    invoiceNo: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

if (mongoose.models.Review) {
  delete mongoose.models.Review;
}

const Review = mongoose.model("Review", ReviewSchema);
export default Review;
