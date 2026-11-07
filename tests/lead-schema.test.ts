import { describe, it, expect } from "vitest";
import { normalizeRow, dupKeys, leadFieldSchemas } from "@/lib/lead-schema";

describe("import row normalisation", () => {
  it("maps labels, parses booleans, price and email", () => {
    const { data, errors } = normalizeRow({ businessName: "Acme", category: "fashion & clothing", businessSize: "subscription based", phone: "01712345678", email: "A@B.com", called: "Yes", runningAds: "no", servicePrice: "৳ 24,000" });
    expect(errors).toEqual([]);
    expect(data).toMatchObject({ category: "FASHION_CLOTHING", businessSize: "SUBSCRIPTION", email: "a@b.com", called: true, runningAds: "NO", servicePrice: 24000 });
  });
  it("rejects unknown size, bad phone and missing name", () => {
    expect(normalizeRow({ businessName: "A", businessSize: "huge" }).data).toBeNull();
    expect(normalizeRow({ businessName: "A", phone: "abc" }).data).toBeNull();
    expect(normalizeRow({ businessName: "" }).data).toBeNull();
  });
  it("falls back to Other for unknown category", () => {
    expect(normalizeRow({ businessName: "A", category: "zzz" }).data?.category).toBe("OTHER");
  });
});

describe("field validation", () => {
  it("normalises social URLs and blocks non-http schemes", () => {
    expect(leadFieldSchemas.facebookUrl.parse("facebook.com/x")).toBe("https://facebook.com/x");
    expect(leadFieldSchemas.facebookUrl.safeParse("javascript:alert(1)").success).toBe(false);
    expect(leadFieldSchemas.instagramUrl.parse("")).toBeNull();
  });
  it("rejects negative prices", () => { expect(leadFieldSchemas.servicePrice.safeParse("-5").success).toBe(false); });
});

describe("duplicate detection", () => {
  it("matches phone formats and page URLs", () => {
    expect(dupKeys({ phone: "01712345678" })).toEqual(dupKeys({ phone: "+880 1712-345678" }));
    expect(dupKeys({ facebookUrl: "https://www.facebook.com/Acme/?ref=x" })).toEqual(dupKeys({ facebookUrl: "facebook.com/acme" }));
    expect(dupKeys({ email: "A@B.com" })).toEqual(["e:a@b.com"]);
  });
});
