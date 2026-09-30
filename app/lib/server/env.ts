// Server-only environment access. Deliberately lazy: nothing is read (or thrown) at
// import time, so `next build` works without secrets and errors surface per-request
// with a readable message instead of a cryptic crash.
//
// Never import this from a Client Component (keep it under app/lib/server/).

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export type ServerEnv = {
  MONGODB_URI: string;
  MONGODB_DB: string;
  AUTH_SECRET: string;
  isProduction: boolean;
};

export function getEnv(): ServerEnv {
  const MONGODB_URI = process.env.MONGODB_URI?.trim();
  const AUTH_SECRET = process.env.AUTH_SECRET?.trim();

  if (!MONGODB_URI) {
    throw new ConfigError(
      "MONGODB_URI is not set. Add the SAME MongoDB Atlas connection string the customer site uses to .env.local (see .env.example)."
    );
  }
  if (!/^mongodb(\+srv)?:\/\//.test(MONGODB_URI)) {
    throw new ConfigError("MONGODB_URI must start with mongodb:// or mongodb+srv://");
  }
  if (!AUTH_SECRET || AUTH_SECRET.length < 32) {
    throw new ConfigError(
      "AUTH_SECRET must be set to a random string of at least 32 characters (see .env.example). Use a DIFFERENT value from the customer site's AUTH_SECRET — these are two separate apps."
    );
  }

  return {
    MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB?.trim() || "orzino",
    AUTH_SECRET,
    isProduction: process.env.NODE_ENV === "production",
  };
}
