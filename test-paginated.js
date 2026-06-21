const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://Chayatol:15V6Erv9WzoHNz3M@cluster0.ig1znrs.mongodb.net/chayatol?retryWrites=true&w=majority&appName=Cluster0';

// Define the Room Schema matching src/models/Room.js
const RoomSchema = new mongoose.Schema(
  {
    roomNumber: String,
    roomType: String,
    price: Number,
    priceWithBreakfast: { type: Number, default: 0 },
    priceWithAllDayFood: { type: Number, default: 0 },
    capacity: Number,
    status: String,
  }
);

const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);

async function test() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Mimic the query logic
    const status = "";
    const inclusion = "";
    const search = "";
    const page = 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) {
      query.status = status;
    }

    if (inclusion) {
      if (inclusion === "breakfast") {
        query.priceWithBreakfast = { $gt: 0 };
      } else if (inclusion === "allday") {
        query.priceWithAllDayFood = { $gt: 0 };
      } else if (inclusion === "roomonly") {
        query.priceWithBreakfast = { $eq: 0 };
        query.priceWithAllDayFood = { $eq: 0 };
      }
    }

    if (search) {
      query.$or = [
        { roomNumber: { $regex: search, $options: "i" } },
        { roomType: { $regex: search, $options: "i" } }
      ];
    }

    console.log("Query:", query);
    const rooms = await Room.find(query)
      .sort({ roomNumber: 1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Room.countDocuments(query);
    
    console.log("Rooms found in query:", rooms.length);
    console.log("Total count:", total);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error("Query failed:", err);
  }
}

test();
