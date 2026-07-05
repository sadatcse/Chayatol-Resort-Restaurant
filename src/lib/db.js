import mongoose from "mongoose";
import ControlSettings from "@/models/ControlSettings";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      // Dynamically fetch and set system-wide Node.js TZ environment variable
      try {
        ControlSettings.findOne({}).then(settings => {
          if (settings && settings.timeZone) {
            process.env.TZ = settings.timeZone;
          }
        }).catch(err => console.error("Error setting Node timezone on DB connect:", err));
      } catch (e) {
        console.warn("Dynamic timezone set failed:", e);
      }
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
