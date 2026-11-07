import { describe, it, expect } from "vitest";
import { meetingSchema } from "@/lib/meeting-schema";
import { paymentSchema } from "@/lib/payment-schema";
import { passwordSchema } from "@/lib/password";

const meeting = { leadId: "l1", title: "Intro", date: "2026-11-10", startTime: "15:00", endTime: "", type: "ONLINE", link: "", location: "", agenda: "", notes: "", outcome: "", nextAction: "", status: "SCHEDULED" };
describe("meeting schema", () => {
  it("accepts a valid meeting", () => { expect(meetingSchema.safeParse(meeting).success).toBe(true); });
  it("rejects end before start, bad dates and unsafe links", () => {
    expect(meetingSchema.safeParse({ ...meeting, endTime: "14:00" }).success).toBe(false);
    expect(meetingSchema.safeParse({ ...meeting, date: "2026-02-31" }).success).toBe(false);
    expect(meetingSchema.safeParse({ ...meeting, link: "javascript:alert(1)" }).success).toBe(false);
  });
});
describe("payment schema", () => {
  const pay = { leadId: "l1", amount: "৳1,234.567", paymentDate: "2026-11-04", method: "bKash", reference: "", notes: "", status: "PAID" };
  it("parses and rounds amounts", () => { expect(paymentSchema.parse(pay).amount).toBe(1234.57); });
  it("rejects zero, non-numeric and unknown status", () => {
    expect(paymentSchema.safeParse({ ...pay, amount: "0" }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...pay, amount: "abc" }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...pay, status: "HACKED" }).success).toBe(false);
  });
});
describe("password policy", () => {
  it("enforces length, letter and number", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("abcdefghij").success).toBe(false);
    expect(passwordSchema.safeParse("abcdefghi1").success).toBe(true);
  });
});
