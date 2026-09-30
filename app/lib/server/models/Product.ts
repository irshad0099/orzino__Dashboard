import { Schema, model, models, type HydratedDocument, type Model } from "mongoose";

/**
 * The catalog. Lives in the same MongoDB Atlas database as the customer site (collection
 * "products") — the storefront (orzino) reads this collection directly, so a price, stock
 * or availability change made here takes effect live, no deploy.
 *
 * Every product must carry a `legacyId`: it's the numeric id the storefront uses in
 * product URLs, cart line ids and `Order.items[].productId` — POST /api/products
 * auto-assigns the next one if the caller doesn't supply it, so this never needs manual care.
 */
export interface IReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface IProduct {
  legacyId?: number; // the numeric id the storefront uses in URLs/cart/orders — every product gets one (see POST /api/products)
  name: string;
  category: string;
  image: string;
  description: string;
  price: number;
  originalPrice: number;
  rating: number;
  weight: string;
  stock: number;
  badge: string;
  isSale: boolean;
  isComingSoon: boolean;
  offerEndsAt: Date | null;
  order: number; // display order in the catalog grid
  reviews: IReview[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProductDoc = HydratedDocument<IProduct>;

const reviewSchema = new Schema<IReview>(
  {
    id: { type: String, required: true },
    author: { type: String, required: true, trim: true, maxlength: 60 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 500 },
    date: { type: String, required: true },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    legacyId: { type: Number },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    image: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 4.8, min: 0, max: 5 },
    weight: { type: String, required: true, trim: true, maxlength: 20 },
    stock: { type: Number, required: true, min: 0, default: 8 },
    badge: { type: String, default: "", trim: true, maxlength: 30 },
    isSale: { type: Boolean, default: false },
    isComingSoon: { type: Boolean, default: false },
    offerEndsAt: { type: Date, default: null },
    order: { type: Number, default: 0 },
    reviews: { type: [reviewSchema], default: [] },
  },
  { timestamps: true }
);

productSchema.index({ order: 1 });
productSchema.index({ legacyId: 1 }, { unique: true, sparse: true });

export const Product: Model<IProduct> =
  (models.Product as Model<IProduct>) || model<IProduct>("Product", productSchema);
