// One-off fix: every ORZINO product is a 30g pack, but older product records may still say
// 250g / 500g in their weight, name or description. This finds them and rewrites to 30g.
//
//   npm run fix-pack-weight            → dry run: only PRINTS what would change
//   npm run fix-pack-weight -- --apply → actually saves the changes
//
// Past orders are deliberately NOT touched — an order is a record of what was sold.

import { connectDB, disconnectDB } from "../app/lib/server/db";
import { Product } from "../app/lib/server/models/Product";

const TARGET = "30g";
// "250g", "250 g", "250gm", "250 gms", "250 grams", "250 ग्राम" (and the same for 500)
const OLD_WEIGHT = /\b(?:250|500)\s?(?:g|gm|gms|gram|grams)\b|(?:250|500)\s?ग्राम/gi;

const fix = (text: string) => text.replace(OLD_WEIGHT, TARGET);

async function main() {
  const apply = process.argv.includes("--apply");
  await connectDB();

  const products = await Product.find({});
  let changed = 0;

  for (const p of products) {
    const next = { weight: fix(p.weight), name: fix(p.name), description: fix(p.description) };
    const diffs = (Object.keys(next) as (keyof typeof next)[]).filter((k) => next[k] !== p[k]);
    if (diffs.length === 0) continue;

    changed++;
    console.log(`\n• ${p.name} (legacyId ${p.legacyId ?? "-"})`);
    for (const k of diffs) console.log(`    ${k}: "${p[k]}"  →  "${next[k]}"`);

    if (apply) {
      p.set(next);
      await p.save();
    }
  }

  if (changed === 0) console.log(`✔ All ${products.length} product(s) already say ${TARGET}. Nothing to do.`);
  else if (apply) console.log(`\n✔ Updated ${changed} product(s) to ${TARGET}.`);
  else console.log(`\n${changed} product(s) would change. Re-run with --apply to save:  npm run fix-pack-weight -- --apply`);
}

main()
  .catch((error: Error) => {
    console.error(`\n✖ ${error.name}: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
