import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

/**
 * The dashboard's own sign-in. No self-registration route exists — the one admin account
 * is created with `npm run create-admin`.
 */
export interface IAdminUser {
  email: string; // lowercase, unique
  passwordHash: string;
  role: "owner" | "staff";
  tokenVersion: number; // bumped on password change → invalidates other admin sessions
  createdAt: Date;
  updatedAt: Date;
}

export type AdminUserDoc = HydratedDocument<IAdminUser>;

const adminUserSchema = new Schema<IAdminUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["owner", "staff"], default: "owner" },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const AdminUser: Model<IAdminUser> =
  (models.AdminUser as Model<IAdminUser>) || model<IAdminUser>("AdminUser", adminUserSchema);
