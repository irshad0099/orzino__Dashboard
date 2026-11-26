import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";

// Mirror of the customer site's ProductQuestion model (orzino: app/lib/server/models/
// ProductQuestion.ts). Shoppers ask there; the team answers / hides here. autoIndex is off —
// the storefront owns this collection's indexes.

export const QUESTION_STATUSES = ["pending", "answered", "hidden"] as const;

export interface IProductQuestion {
  productId: number;
  userId: Types.ObjectId | null;
  name: string;
  email: string;
  question: string;
  answer: string;
  answeredAt: Date | null;
  status: (typeof QUESTION_STATUSES)[number];
  createdAt: Date;
  updatedAt: Date;
}

export type ProductQuestionDoc = HydratedDocument<IProductQuestion>;

const questionSchema = new Schema<IProductQuestion>(
  {
    productId: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, default: null },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    question: { type: String, required: true },
    answer: { type: String, default: "", trim: true, maxlength: 1000 },
    answeredAt: { type: Date, default: null },
    status: { type: String, enum: QUESTION_STATUSES, default: "pending" },
  },
  { timestamps: true, collection: "productquestions", autoIndex: false }
);

export const ProductQuestion: Model<IProductQuestion> =
  (models.ProductQuestion as Model<IProductQuestion>) ||
  model<IProductQuestion>("ProductQuestion", questionSchema);
