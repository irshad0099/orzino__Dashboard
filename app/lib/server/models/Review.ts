import { Schema, model, models, type HydratedDocument, type Model, type Types } from "mongoose";

// Mirror of the customer site's Review model (orzino: app/lib/server/models/Review.ts), which
// creates reviews and owns the collection's indexes. The dashboard only lists them and flips
// `status` (hide / re-publish). autoIndex is off — never sync indexes from here.

export const REVIEW_STATUSES = ["published", "hidden"] as const;

export interface IReview {
  productId: number;
  orderId: string;
  userId: Types.ObjectId | null;
  authorName: string;
  rating: number;
  comment: string;
  media: { type: "image" | "video"; url: string }[];
  status: (typeof REVIEW_STATUSES)[number];
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDoc = HydratedDocument<IReview>;

const reviewSchema = new Schema<IReview>(
  {
    productId: { type: Number, required: true },
    orderId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, default: null },
    authorName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    media: { type: [{ type: { type: String }, url: String, _id: false }], default: [] },
    status: { type: String, enum: REVIEW_STATUSES, default: "published" },
  },
  { timestamps: true, collection: "reviews", autoIndex: false }
);

export const Review: Model<IReview> = (models.Review as Model<IReview>) || model<IReview>("Review", reviewSchema);
