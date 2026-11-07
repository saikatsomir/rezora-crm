import { z } from "zod";
export const passwordSchema = z.string().min(10, "At least 10 characters").max(128, "Too long").regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number");
