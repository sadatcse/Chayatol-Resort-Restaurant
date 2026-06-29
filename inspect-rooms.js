const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://Chayatol:15V6Erv9WzoHNz3M@cluster0.ig1znrs.mongodb.net/chayatol?retryWrites=true&w=majority&appName=Cluster0';

async function test() {
  try {
    console.log("Connecting...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected! Querying rooms...");
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    const rooms = await db.collection('rooms').find({}).toArray();
    console.log(`Found ${rooms.length} rooms.`);
    if (rooms.length > 0) {
      console.log("First room sample:", JSON.stringify(rooms[0], null, 2));
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
