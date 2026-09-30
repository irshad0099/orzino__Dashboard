import mongoose from "mongoose";
import { getEnv } from "./env";

// Cache the connection on globalThis so Next's dev HMR and Vercel's warm serverless
// invocations reuse one connection instead of opening a new one per request. Same MongoDB
// Atlas cluster/database the customer site (orzino) connects to — different process, so
// this cache never collides with that app's.
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as unknown as { __orzinoAdminMongoose?: Cache };
const cache: Cache = (g.__orzinoAdminMongoose ??= { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

  const { MONGODB_URI, MONGODB_DB } = getEnv();
  cache.promise ??= mongoose.connect(MONGODB_URI, {
    dbName: MONGODB_DB,
    bufferCommands: false,
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 10,
  });

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null; // let the next request retry
    cache.conn = null;
    throw error;
  }
  return cache.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cache.conn) await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
