// One-time migration: copies the storefront's static catalog (app/data/catalog.ts in the
// orzino repo) into the Product collection here, so the dashboard has real data to manage.
// Safe to re-run — it skips any legacyId that's already present.
//
//   npm run seed-products

import { connectDB, disconnectDB } from "../app/lib/server/db";
import { Product } from "../app/lib/server/models/Product";

// The "sale ends in..." countdown the storefront shows on a product card — unlike the old
// static catalog.ts (which reset this to a fresh 5-12 hours on every server restart), this
// is a fixed date from whenever this script runs. There's no dashboard UI to edit it yet;
// re-run this script (it's a no-op for products that already exist) or update it directly
// in Atlas if you need to push it out further.
const daysFromNow = (days: number) => new Date(Date.now() + 1000 * 60 * 60 * 24 * days).toISOString();

const CATALOG = [
  {
    legacyId: 1,
    name: "Pineapple Slices",
    category: "Fruit Cubes",
    image: "/images/newPineapple.jpeg",
    description:
      "Experience the tropical burst of our premium freeze-dried pineapple slices. 100% natural, no added sugar, and retains 98% of its original nutrients. Perfect for snacking, adding to smoothies, or baking.",
    price: 149,
    originalPrice: 249,
    rating: 4.9,
    weight: "30g",
    stock: 8,
    badge: "Best Seller",
    isSale: true,
    isComingSoon: false,
    offerEndsAt: daysFromNow(7),
    order: 0,
    reviews: [
      { id: "r1", author: "Aarav S.", rating: 5, comment: "Insanely crunchy!", date: "2 days ago" },
      { id: "r2", author: "Pooja M.", rating: 4, comment: "Great healthy snack.", date: "1 week ago" },
    ],
  },
  {
    legacyId: 2,
    name: "Mango Slices",
    category: "Crispy Slices",
    image: "/images/newMango.jpeg",
    description:
      "Sweet, tangy, and incredibly crispy. Our freeze-dried Alphonso mango slices are the perfect guilt-free treat for all ages.",
    price: 149,
    originalPrice: 249,
    rating: 4.8,
    weight: "30g",
    stock: 8,
    badge: "Popular",
    isSale: true,
    isComingSoon: false,
    offerEndsAt: daysFromNow(7),
    order: 1,
    reviews: [{ id: "r3", author: "Rohan V.", rating: 5, comment: "Pure mango sweetness.", date: "3 days ago" }],
  },
  {
    legacyId: 3,
    name: "Banana Chips",
    category: "Jars",
    image: "/images/banana.jpeg",
    description: "Deliciously crisp and naturally sweet freeze-dried banana chips.",
    price: 149,
    originalPrice: 249,
    rating: 4.9,
    weight: "30g",
    stock: 8,
    badge: "Trending",
    isSale: true,
    isComingSoon: true,
    order: 2,
    reviews: [{ id: "r4", author: "Sneha K.", rating: 5, comment: "Amazing with yogurt.", date: "Yesterday" }],
  },
  {
    legacyId: 4,
    name: "Pineapple Slices Pouch",
    category: "Pouches",
    image: "/images/pineapple.jpeg",
    description: "Our freeze-dried pineapple slices in a convenient, resealable on-the-go pouch.",
    price: 149,
    originalPrice: 249,
    rating: 4.7,
    weight: "30g",
    stock: 8,
    badge: "",
    isSale: true,
    isComingSoon: true,
    order: 3,
    reviews: [],
  },
  {
    legacyId: 5,
    name: "Apple Chips",
    category: "Fruit Cubes",
    image: "/images/apple.jpeg",
    description: "Crunchy apple chips that taste like autumn in a bite.",
    price: 149,
    originalPrice: 249,
    rating: 4.8,
    weight: "30g",
    stock: 8,
    badge: "New",
    isSale: false,
    isComingSoon: true,
    order: 4,
    reviews: [],
  },
  {
    legacyId: 6,
    name: "Guava Snacks",
    category: "Crispy Slices",
    image: "/images/guava.jpeg",
    description: "Tangy, naturally sweet freeze-dried guava with a satisfying crunch.",
    price: 149,
    originalPrice: 249,
    rating: 4.6,
    weight: "30g",
    stock: 8,
    badge: "",
    isSale: true,
    isComingSoon: true,
    order: 5,
    reviews: [],
  },
  {
    legacyId: 7,
    name: "Strawberry Guac",
    category: "Pouches",
    image: "/images/strawberry.jpeg",
    description: "Bright, juicy strawberry flavour, freeze-dried into a light and crunchy snack.",
    price: 149,
    originalPrice: 249,
    rating: 4.7,
    weight: "30g",
    stock: 8,
    badge: "",
    isSale: false,
    isComingSoon: true,
    order: 6,
    reviews: [],
  },
];

async function main() {
  await connectDB();

  let created = 0;
  let updated = 0;
  for (const item of CATALOG) {
    const existing = await Product.findOne({ legacyId: item.legacyId });
    if (existing) {
      // Don't touch anything the admin dashboard already lets someone edit (price, stock,
      // isComingSoon, badge, ...) — only backfill fields added to the schema after this
      // product was first seeded, which nothing can have intentionally changed yet.
      // rating/reviews are NOT touched any more: ratings now come from real verified-buyer
      // reviews (Review collection) and re-running this must never overwrite them.
      if (!existing.offerEndsAt && item.offerEndsAt) existing.offerEndsAt = new Date(item.offerEndsAt);
      await existing.save();
      updated++;
      continue;
    }
    await Product.create(item);
    created++;
  }

  console.log(`✔ Seeded ${created} new product(s), backfilled newer fields on ${updated} existing one(s).`);
}

main()
  .catch((error: Error) => {
    console.error(`\n✖ ${error.name}: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
