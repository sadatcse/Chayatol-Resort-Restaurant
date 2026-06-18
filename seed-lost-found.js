import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI environment variable!");
  process.exit(1);
}

// Schemas & Models
const lostFoundCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const LostFoundCategory =
  mongoose.models.LostFoundCategory ||
  mongoose.model("LostFoundCategory", lostFoundCategorySchema);

const lostFoundLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Room", "Lobby", "Reception", "Pool", "Restaurant", "Parking", "Others"],
      default: "Others",
    },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const LostFoundLocation =
  mongoose.models.LostFoundLocation ||
  mongoose.model("LostFoundLocation", lostFoundLocationSchema);

const permissionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    isAllowed: { type: Boolean, required: true },
    role: { type: String, required: true },
    group_name: { type: String, required: true },
    path: { type: String, required: true },
  },
  { timestamps: true }
);

// Unique index
permissionSchema.index({ role: 1, path: 1 }, { unique: true });

const Permission =
  mongoose.models.Permission || mongoose.model("Permission", permissionSchema);

// Data sets
const defaultCategories = [
  { name: "Electronics", description: "Phones, chargers, laptops, cameras" },
  { name: "Clothing", description: "Shirts, jackets, trousers, hats" },
  { name: "Jewelry", description: "Rings, necklaces, bracelets, watches" },
  { name: "Wallet", description: "Wallets, purses, money clips" },
  { name: "Documents", description: "Passports, IDs, booking slips, licenses" },
  { name: "Keys", description: "Room keys, car keys, house keys" },
  { name: "Mobile Phones", description: "Smartphones and related accessories" },
  { name: "Luggage", description: "Suitcases, backpacks, handbags" },
  { name: "Accessories", description: "Glasses, belts, umbrellas" },
  { name: "Others", description: "Miscellaneous found items" },
];

const defaultLocations = [
  { name: "Main Lobby", type: "Lobby", description: "Central reception lobby area" },
  { name: "Front Reception Desk", type: "Reception", description: "Main check-in and check-out desk" },
  { name: "Swimming Pool Area", type: "Pool", description: "Pool decks and surrounding sunbeds" },
  { name: "Chayatol Dining Room", type: "Restaurant", description: "Main resort restaurant" },
  { name: "South Gate Parking", type: "Parking", description: "Resort parking lot" },
  { name: "Room 101", type: "Room", description: "Deluxe Suite Room 101" },
  { name: "Room 102", type: "Room", description: "Standard Room 102" },
  { name: "Room 201", type: "Room", description: "Executive Suite Room 201" },
  { name: "Secure Storage Locker A", type: "Others", description: "Main back-office locker A" },
  { name: "Secure Storage Locker B", type: "Others", description: "Main back-office locker B" },
];

// Map RBAC rules
const roles = ["superadmin", "admin", "manager"];

const permissionRules = {
  superadmin: {
    // Routes
    "/dashboard/lost-found/dashboard": true,
    "/dashboard/lost-found/new-item": true,
    "/dashboard/lost-found/active-items": true,
    "/dashboard/lost-found/claims": true,
    "/dashboard/lost-found/returns": true,
    "/dashboard/lost-found/return-notes": true,
    "/dashboard/lost-found/reports": true,
    "/dashboard/lost-found/categories": true,
    "/dashboard/lost-found/locations": true,
    "/dashboard/lost-found/settings": true,
    // Custom Keys
    "lost_found.view": true,
    "lost_found.create": true,
    "lost_found.edit": true,
    "lost_found.delete": true,
    "lost_found.claims.view": true,
    "lost_found.claims.verify": true,
    "lost_found.return.create": true,
    "lost_found.return.print": true,
    "lost_found.reports.view": true,
    "lost_found.settings.manage": true,
  },
  admin: {
    // Routes
    "/dashboard/lost-found/dashboard": true,
    "/dashboard/lost-found/new-item": true,
    "/dashboard/lost-found/active-items": true,
    "/dashboard/lost-found/claims": true,
    "/dashboard/lost-found/returns": true,
    "/dashboard/lost-found/return-notes": true,
    "/dashboard/lost-found/reports": true,
    "/dashboard/lost-found/categories": true,
    "/dashboard/lost-found/locations": true,
    "/dashboard/lost-found/settings": true,
    // Custom Keys
    "lost_found.view": true,
    "lost_found.create": true,
    "lost_found.edit": true,
    "lost_found.delete": true,
    "lost_found.claims.view": true,
    "lost_found.claims.verify": true,
    "lost_found.return.create": true,
    "lost_found.return.print": true,
    "lost_found.reports.view": true,
    "lost_found.settings.manage": true,
  },
  manager: {
    // Routes (Manager can see everything except settings config)
    "/dashboard/lost-found/dashboard": true,
    "/dashboard/lost-found/new-item": true,
    "/dashboard/lost-found/active-items": true,
    "/dashboard/lost-found/claims": true,
    "/dashboard/lost-found/returns": true,
    "/dashboard/lost-found/return-notes": true,
    "/dashboard/lost-found/reports": true,
    "/dashboard/lost-found/categories": false,
    "/dashboard/lost-found/locations": false,
    "/dashboard/lost-found/settings": false,
    // Custom Keys
    "lost_found.view": true,
    "lost_found.create": true,
    "lost_found.edit": true,
    "lost_found.delete": false, // Cannot delete items
    "lost_found.claims.view": true,
    "lost_found.claims.verify": true,
    "lost_found.return.create": true,
    "lost_found.return.print": true,
    "lost_found.reports.view": true,
    "lost_found.settings.manage": false,
  },
};

async function seed() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    // Seed Categories
    console.log("Seeding Categories...");
    for (const cat of defaultCategories) {
      await LostFoundCategory.findOneAndUpdate(
        { name: cat.name },
        { $set: cat },
        { upsert: true, new: true }
      );
    }
    console.log("✓ Categories seeded.");

    // Seed Locations
    console.log("Seeding Locations...");
    for (const loc of defaultLocations) {
      await LostFoundLocation.findOneAndUpdate(
        { name: loc.name },
        { $set: loc },
        { upsert: true, new: true }
      );
    }
    console.log("✓ Locations seeded.");

    // Seed Permissions
    console.log("Seeding Permissions...");
    for (const role of roles) {
      const rules = permissionRules[role];
      for (const [path, isAllowed] of Object.entries(rules)) {
        // Compute title
        let title = path.split("/").pop() || path;
        title = title.replace(/[_\-\.]/g, " ");

        await Permission.findOneAndUpdate(
          { role, path },
          {
            $set: {
              title,
              isAllowed,
              role,
              group_name: path.startsWith("/") ? "Lost & Found" : "Lost & Found Actions",
              path,
            },
          },
          { upsert: true, new: true }
        );
      }
    }
    console.log("✓ Permissions seeded.");

    console.log("Seeding finished successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
