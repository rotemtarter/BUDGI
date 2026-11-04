import { z } from "zod";

// The word typed to confirm account deletion (PRD 4.9, DESIGN.md 1.10 area 6)
export const DELETE_CONFIRM_WORD = "מחק";

export const isDeleteConfirmed = (value: string) => value.trim() === DELETE_CONFIRM_WORD;

export const deleteAccountSchema = z.object({
  confirm: z.string().refine(isDeleteConfirmed),
});

export const ACCOUNT_MESSAGES = {
  failed: "מחיקת החשבון נכשלה. נסה שוב.",
  notConfirmed: "יש להקליד „מחק” כדי לאשר",
  signedOut: "יש להתחבר מחדש",
} as const;
