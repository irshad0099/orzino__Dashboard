// Creates (or resets the password of) an admin account. No public sign-up route exists on
// purpose — this script is the only way to create one.
//
//   npm run create-admin -- --email you@orzino.com --password "Secret#123"
//
// Reads MONGODB_URI / MONGODB_DB / AUTH_SECRET from .env.local (the SAME Atlas database
// the customer site uses — this just adds an AdminUser document to it).

import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../app/lib/server/db";
import { AdminUser } from "../app/lib/server/models/AdminUser";

// Hashed directly here (not via app/lib/server/auth.ts) because that file is guarded by
// `server-only`, which refuses to load outside Next's build — a plain script can't import it.
const hashPassword = (password: string) => bcrypt.hash(password, 12);

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

function arg(name: string): string | undefined {
  const flag = `--${name}`;
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return process.env[`ADMIN_${name.toUpperCase()}`];
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const password = arg("password");

  if (!email || !isValidEmail(email)) {
    throw new Error('Pass a valid --email, e.g. npm run create-admin -- --email you@orzino.com --password "Secret#123"');
  }
  if (!password || password.length < 8) {
    throw new Error("Pass a --password of at least 8 characters.");
  }

  await connectDB();
  const passwordHash = await hashPassword(password);

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.tokenVersion += 1; // sign out any existing sessions for this admin
    await existing.save();
    console.log(`✔ Password updated for existing admin ${email}`);
  } else {
    await AdminUser.create({ email, passwordHash, role: "owner" });
    console.log(`✔ Admin account created: ${email}`);
  }

  console.log("You can now sign in at /login.");
}

main()
  .catch((error: Error) => {
    console.error(`\n✖ ${error.name}: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
