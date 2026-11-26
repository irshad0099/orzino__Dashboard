// Seller details printed on invoices and shipping labels. Mirrors `siteConfig` in the customer
// site (orzino: app/lib/siteConfig.ts) — keep the two in sync if the business details change.
export const business = {
  brandName: "ORZINO",
  legalName: "ORZINO Freeze Dried Fruits",
  email: "support@orzino.com",
  phoneDisplay: "+91 87577 26925",
  address: "P-101, Gali No. 3, Nafees Road, Batla House, Jamia Nagar, Okhla, South East Delhi - 110025",
  gstin: "07EPIPA4539D1Z4",
  fssaiLicenseNumber: "23326010003215",
  siteUrl: "orzino.com",
} as const;
