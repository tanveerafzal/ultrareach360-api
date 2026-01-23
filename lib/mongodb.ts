import mongoose from "mongoose";
import { logger as globalLogger } from "@/lib/logger";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  globalLogger.error("MongoDB URI not configured", null, {
    envVar: "MONGODB_URI",
    hint: "Please define the MONGODB_URI environment variable",
  });
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

// Log configuration at startup (mask the URI for security)
const maskedUri = MONGODB_URI.replace(
  /\/\/([^:]+):([^@]+)@/,
  "//***:***@"
);
globalLogger.info("MongoDB configuration loaded", {
  uriConfigured: true,
  uriPreview: maskedUri.substring(0, 50) + "...",
});

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    globalLogger.debug("Using cached MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    globalLogger.info("Establishing new MongoDB connection");
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      globalLogger.info("MongoDB connection established successfully", {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      });
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: any) {
    cached.promise = null;
    globalLogger.error("MongoDB connection failed", e, {
      errorName: e.name,
      errorCode: e.code,
    });
    throw e;
  }

  return cached.conn;
}

export default connectDB;
