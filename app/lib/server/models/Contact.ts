import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";

// Mirrors app/lib/server/models/Contact.ts in the customer site (orzino) — both apps read
// and write the SAME "contacts" collection in the same Atlas database.
//
// IMPORTANT: never call Contact.syncIndexes() from this app — orzino owns this collection.
// See the same warning in models/Order.ts.

export interface IContact {
  reference: string;
  name: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
  status: "new" | "read" | "resolved";
  userId: Types.ObjectId | null;
  ip: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ContactDoc = HydratedDocument<IContact>;

const contactSchema = new Schema<IContact>(
  {
    reference: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, default: "", lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    topic: { type: String, required: true, trim: true, maxlength: 40 },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    status: { type: String, enum: ["new", "read", "resolved"], default: "new" },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "", maxlength: 300 },
  },
  { timestamps: true }
);

export const Contact: Model<IContact> =
  (models.Contact as Model<IContact>) || model<IContact>("Contact", contactSchema);
