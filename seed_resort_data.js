import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

// Model Definitions
const resortServiceCategorySchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

const ResortServiceCategory = mongoose.models.ResortServiceCategory || mongoose.model("ResortServiceCategory", resortServiceCategorySchema);

const resortServiceSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    status: { type: String, enum: ["Available", "Unavailable"], default: "Available" },
  },
  { timestamps: true }
);

const ResortService = mongoose.models.ResortService || mongoose.model("ResortService", resortServiceSchema);


const categoriesData = [
  { categoryName: "Spa & Wellness", description: "Relaxing treatments and massages." },
  { categoryName: "Recreation & Activities", description: "Outdoor and indoor games, tours, and activities." },
  { categoryName: "Room Upgrades & Add-ons", description: "Extra beds, room decor, etc." },
  { categoryName: "Transportation", description: "Airport pickup, local tours, car rental." },
  { categoryName: "Laundry Service", description: "Washing, ironing, and dry cleaning." }
];

const servicesData = [
  // Spa
  { serviceName: "Swedish Massage (60 min)", category: "Spa & Wellness", price: 2500, status: "Available" },
  { serviceName: "Deep Tissue Massage (90 min)", category: "Spa & Wellness", price: 3500, status: "Available" },
  { serviceName: "Facial Treatment", category: "Spa & Wellness", price: 1500, status: "Available" },
  
  // Recreation
  { serviceName: "Guided Jungle Trek", category: "Recreation & Activities", price: 500, status: "Available" },
  { serviceName: "Pool Access (Non-Guest)", category: "Recreation & Activities", price: 800, status: "Available" },
  { serviceName: "Bicycle Rental (Half Day)", category: "Recreation & Activities", price: 300, status: "Available" },
  { serviceName: "Billiard/Pool Table (1 Hour)", category: "Recreation & Activities", price: 200, status: "Available" },
  
  // Add-ons
  { serviceName: "Extra Bed", category: "Room Upgrades & Add-ons", price: 1000, status: "Available" },
  { serviceName: "Honeymoon Room Setup", category: "Room Upgrades & Add-ons", price: 2000, status: "Available" },
  { serviceName: "Late Checkout Fee", category: "Room Upgrades & Add-ons", price: 1500, status: "Available" },

  // Transport
  { serviceName: "Airport Pickup", category: "Transportation", price: 3000, status: "Available" },
  { serviceName: "Local Sightseeing Car (Full Day)", category: "Transportation", price: 4500, status: "Available" },
  
  // Laundry
  { serviceName: "Standard Wash & Iron (Per Piece)", category: "Laundry Service", price: 50, status: "Available" },
  { serviceName: "Dry Cleaning (Suit)", category: "Laundry Service", price: 350, status: "Available" }
];

async function seedData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Clear existing to avoid duplicates if they want fresh data
    await ResortServiceCategory.deleteMany({});
    await ResortService.deleteMany({});
    console.log("Cleared existing Resort categories and services.");

    // Insert Categories
    await ResortServiceCategory.insertMany(categoriesData);
    console.log("Inserted Categories.");

    // Insert Services
    await ResortService.insertMany(servicesData);
    console.log("Inserted Services.");

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
}

seedData();
