import { z } from "zod";
import { isDay } from "./dates";

export const MEETING_TYPES = { ONLINE: "Online", OFFLINE: "Offline", PHONE_CALL: "Phone Call" } as const;
export const MEETING_STATUSES = { SCHEDULED: "Scheduled", COMPLETED: "Completed", CANCELLED: "Cancelled", RESCHEDULED: "Rescheduled" } as const;
export type MeetingStatus = keyof typeof MEETING_STATUSES;
const nul = (v: unknown) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v);
const text = (n: number) => z.preprocess(nul, z.string().trim().max(n).nullable());
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Pick a time");

export const meetingSchema = z.object({
  leadId: z.string().min(1, "Choose a business").max(40),
  title: z.string().trim().min(1, "Required").max(200),
  date: z.string().refine(isDay, "Pick a valid date"),
  startTime: time,
  endTime: z.preprocess(nul, time.nullable()),
  type: z.enum(Object.keys(MEETING_TYPES) as [keyof typeof MEETING_TYPES, ...(keyof typeof MEETING_TYPES)[]]),
  link: z.preprocess(nul, z.string().trim().max(500).url("Enter a valid URL").refine((u) => /^https?:\/\//i.test(u), "Must start with http(s)://").nullable()),
  location: text(300), agenda: text(2000), notes: text(2000), outcome: text(2000), nextAction: text(1000),
  status: z.enum(Object.keys(MEETING_STATUSES) as [MeetingStatus, ...MeetingStatus[]]),
}).refine((v) => !v.endTime || v.endTime > v.startTime, { path: ["endTime"], message: "End must be after start" });

export type MeetingDTO = {
  id: string; leadId: string; businessName: string; title: string; date: string; startTime: string; endTime: string | null;
  type: keyof typeof MEETING_TYPES; link: string | null; location: string | null; agenda: string | null; notes: string | null;
  outcome: string | null; nextAction: string | null; status: MeetingStatus;
};
