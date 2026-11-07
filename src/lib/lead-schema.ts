import { z } from "zod";

export const CATEGORY_LABELS = {
  FASHION_CLOTHING: "Fashion & Clothing", THREE_PIECE_SAREE: "Three Piece & Saree", MENS_FASHION: "Men's Fashion", WOMENS_FASHION: "Women's Fashion",
  COSMETICS_BEAUTY: "Cosmetics & Beauty", ELECTRONICS_GADGETS: "Electronics & Gadgets", MOBILE_ACCESSORIES: "Mobile & Accessories",
  FOOD_RESTAURANT: "Food & Restaurant", GROCERY_SUPERSHOP: "Grocery & Super Shop", FURNITURE_HOME_DECOR: "Furniture & Home Decor",
  LIFESTYLE_PRODUCTS: "Lifestyle Products", JEWELRY_ACCESSORIES: "Jewelry & Accessories", FOOTWEAR: "Footwear", HEALTH_WELLNESS: "Health & Wellness",
  EDUCATION_TRAINING: "Education & Training", REAL_ESTATE: "Real Estate", TRAVEL_TOURISM: "Travel & Tourism", AUTOMOTIVE: "Automotive",
  DIGITAL_PRODUCTS: "Digital Products", ECOMMERCE: "E-commerce", OTHER: "Other",
} as const;
export const SIZE_LABELS = { GROWTH: "Growth", BUSINESS: "Business", STARTER: "Starter", SUBSCRIPTION: "Subscription Based" } as const;
export const ADS_LABELS = { YES: "Yes", NO: "No", UNKNOWN: "Unknown" } as const;
export type Category = keyof typeof CATEGORY_LABELS;
export type Size = keyof typeof SIZE_LABELS;
export type Ads = keyof typeof ADS_LABELS;
export const CATEGORIES = Object.keys(CATEGORY_LABELS) as [Category, ...Category[]];
export const SIZES = Object.keys(SIZE_LABELS) as [Size, ...Size[]];
export const ADS = Object.keys(ADS_LABELS) as [Ads, ...Ads[]];

export const FIELD_LABELS = {
  businessName: "Business Name", facebookUrl: "Facebook Page", instagramUrl: "Instagram Page", phone: "Phone Number", category: "Category",
  businessSize: "Business Size", email: "Gmail", called: "Called", runningAds: "Running Ads", ownerNumber: "Owner Number", servicePrice: "Service Pricing",
} as const;
export type ImportField = keyof typeof FIELD_LABELS;
export const IMPORT_FIELDS = Object.keys(FIELD_LABELS) as ImportField[];

const nul = (v: unknown) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v);
const url = z.preprocess(
  (v) => { const x = nul(v); return typeof x === "string" && !/^[a-z][a-z0-9+.-]*:\/\//i.test(x.trim()) ? "https://" + x.trim() : x; },
  z.string().trim().max(500).url("Enter a valid URL").refine((u) => /^https?:\/\//i.test(u), "Must start with http(s)://").nullable(),
);
const phone = z.preprocess(nul, z.string().trim().regex(/^\+?\d[\d\s\-()]{5,19}$/, "Invalid phone number").nullable());
const email = z.preprocess(nul, z.string().trim().toLowerCase().email("Invalid email").max(200).nullable());
const price = z.preprocess((v) => {
  const x = nul(v);
  if (typeof x === "string") { const n = Number(x.replace(/[৳,\s]/g, "")); return Number.isNaN(n) ? x : n; }
  return x;
}, z.number({ invalid_type_error: "Must be a number" }).nonnegative("Must be positive").max(1_000_000_000).nullable());

export const leadFieldSchemas = {
  businessName: z.string().trim().min(1, "Required").max(200),
  facebookUrl: url, instagramUrl: url, phone,
  category: z.enum(CATEGORIES),
  businessSize: z.preprocess(nul, z.enum(SIZES).nullable()),
  email, called: z.boolean(), runningAds: z.enum(ADS), ownerNumber: phone, servicePrice: price,
};
export type LeadField = keyof typeof leadFieldSchemas;
export const createLeadSchema = z.object(leadFieldSchemas);

// ---------- Import helpers (pure, shared by client preview and server) ----------
export const HEADER_ALIASES: Record<ImportField, string[]> = {
  businessName: ["businessname", "name", "business", "pagename", "company"],
  facebookUrl: ["facebook", "facebookpage", "facebookurl", "fb", "fbpage"],
  instagramUrl: ["instagram", "instagrampage", "instagramurl", "ig"],
  phone: ["phone", "phonenumber", "mobile", "contact"],
  category: ["category", "businesscategory"],
  businessSize: ["businesssize", "size", "classification"],
  email: ["email", "gmail", "emailaddress"],
  called: ["called", "calledornot", "callstatus"],
  runningAds: ["runningads", "ads", "adstatus"],
  ownerNumber: ["ownernumber", "ownerphone", "owner"],
  servicePrice: ["servicepricing", "serviceprice", "price", "pricing"],
};
export const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function matchKey<K extends string>(map: Record<K, string>, v: string): K | null {
  const n = normKey(v);
  for (const [k, l] of Object.entries(map) as [K, string][]) if (normKey(k) === n || normKey(l) === n) return k;
  return null;
}

export function normalizeRow(raw: Partial<Record<ImportField, string>>) {
  const errors: string[] = [];
  const g = (k: ImportField) => String(raw[k] ?? "").trim();
  const category: Category = (g("category") && matchKey(CATEGORY_LABELS, g("category"))) || "OTHER";
  let businessSize: Size | null = null;
  if (g("businessSize")) {
    businessSize = matchKey(SIZE_LABELS, g("businessSize")) ?? (normKey(g("businessSize")) === "subscription" ? "SUBSCRIPTION" : null);
    if (!businessSize) errors.push("Unknown business size");
  }
  const yes = /^(y|yes|true|1|called|running)$/i, no = /^(n|no|false|0)$/i;
  const parsed = createLeadSchema.safeParse({
    businessName: g("businessName"), facebookUrl: g("facebookUrl"), instagramUrl: g("instagramUrl"), phone: g("phone"), category, businessSize,
    email: g("email"), called: yes.test(g("called")), runningAds: yes.test(g("runningAds")) ? "YES" : no.test(g("runningAds")) ? "NO" : "UNKNOWN",
    ownerNumber: g("ownerNumber"), servicePrice: g("servicePrice"),
  });
  if (!parsed.success) for (const i of parsed.error.issues) errors.push(`${FIELD_LABELS[i.path[0] as ImportField] ?? i.path[0]}: ${i.message}`);
  return { data: parsed.success && errors.length === 0 ? parsed.data : null, errors };
}

const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "");
const urlKey = (s?: string | null) => (s ? s.toLowerCase().replace(/^https?:\/\/(www\.|m\.|web\.)?/, "").replace(/[?#].*$/, "").replace(/\/+$/, "") : "");
export function dupKeys(d: { phone?: string | null; ownerNumber?: string | null; facebookUrl?: string | null; instagramUrl?: string | null; email?: string | null }) {
  const k: string[] = [];
  for (const p of [d.phone, d.ownerNumber]) { const x = digits(p); if (x.length >= 7) k.push("p:" + x.slice(-10)); }
  const f = urlKey(d.facebookUrl); if (f) k.push("f:" + f);
  const i = urlKey(d.instagramUrl); if (i) k.push("i:" + i);
  if (d.email) k.push("e:" + d.email.toLowerCase());
  return k;
}

// ---------- DTOs ----------
export type LeadRow = {
  id: string; businessName: string; facebookUrl: string | null; instagramUrl: string | null; phone: string | null; category: Category;
  businessSize: Size | null; email: string | null; called: boolean; runningAds: Ads; ownerNumber: string | null; servicePrice: number | null;
  createdAt: string; nextMeeting: string | null; notesCount: number; notesDue: boolean;
};
export type NoteDTO = { id: string; content: string; createdAt: string; reminderDate: string | null; reminderTime: string | null; completed: boolean };
