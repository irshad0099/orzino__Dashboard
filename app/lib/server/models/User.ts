import { Schema, model, models, type Model, type Types } from "mongoose";

// READ-ONLY mirror of the customer site's User model (orzino: app/lib/server/models/User.ts) —
// customer accounts are created there; the dashboard only lists them. Only the fields the
// dashboard shows are declared, and the password hash is never selected.
//
// IMPORTANT: never call User.syncIndexes() from this app (it would drop the storefront's
// unique indexes on phone/email). `autoIndex: false` keeps Mongoose from touching indexes too.

export interface IUserAddress {
  _id: Types.ObjectId;
  label: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

export interface IUser {
  name: string;
  phone: string;
  email: string;
  addresses: IUserAddress[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: String,
    phone: String,
    email: String,
    addresses: [{ label: String, name: String, phone: String, address: String, isDefault: Boolean }],
  },
  { timestamps: true, autoIndex: false, strict: true }
);

export const User: Model<IUser> = (models.User as Model<IUser>) || model<IUser>("User", userSchema);
