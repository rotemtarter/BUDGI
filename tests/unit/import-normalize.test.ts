import { describe, expect, it } from "vitest";
import { campaignKey, parseImportDate, parseImportNumber, parsePlatform } from "@/lib/imports/normalize";

describe("parseImportDate", () => {
  it("reads DD/MM/YYYY, with or without leading zeros", () => {
    expect(parseImportDate("25/10/2026")).toEqual({ ok: true, value: "2026-10-25" });
    expect(parseImportDate("5/1/2026")).toEqual({ ok: true, value: "2026-01-05" });
    expect(parseImportDate("05.01.2026")).toEqual({ ok: true, value: "2026-01-05" });
  });

  it("reads YYYY-MM-DD, also with a time", () => {
    expect(parseImportDate("2026-10-25")).toEqual({ ok: true, value: "2026-10-25" });
    expect(parseImportDate(" 2026-10-25 00:00:00 ")).toEqual({ ok: true, value: "2026-10-25" });
  });

  it("reads an Excel date serial", () => {
    // 46320 = 2026-10-25 in Excel
    expect(parseImportDate(46320)).toEqual({ ok: true, value: "2026-10-25" });
    expect(parseImportDate(46320.75)).toEqual({ ok: true, value: "2026-10-25" });
  });

  it("rejects dates that do not exist and other formats", () => {
    for (const value of ["31/02/2026", "10/25/2026", "2026/10/25", "October 25", "25/10/26", "", 0, -3]) {
      expect(parseImportDate(value).ok).toBe(false);
    }
  });
});

describe("parsePlatform", () => {
  it("accepts the four platforms in any case and spacing", () => {
    expect(parsePlatform("Meta Ads")).toEqual({ ok: true, value: "meta_ads" });
    expect(parsePlatform("  google   ADS ")).toEqual({ ok: true, value: "google_ads" });
    expect(parsePlatform("TikTok")).toEqual({ ok: true, value: "tiktok_ads" });
    expect(parsePlatform("linkedin ads")).toEqual({ ok: true, value: "linkedin_ads" });
  });

  it("reads Facebook and Instagram as Meta Ads", () => {
    for (const value of ["Facebook", "instagram", "Facebook Ads", "Instagram Ads"]) {
      expect(parsePlatform(value)).toEqual({ ok: true, value: "meta_ads" });
    }
  });

  it("rejects other platforms", () => {
    expect(parsePlatform("Snapchat")).toEqual({ ok: false, message: "פלטפורמה לא מוכרת: Snapchat" });
  });
});

describe("parseImportNumber", () => {
  it("reads text like the forms: ₪, commas and spaces", () => {
    expect(parseImportNumber("₪1,250.50")).toEqual({ ok: true, value: 1250.5 });
    expect(parseImportNumber(" 12 ", { integer: true })).toEqual({ ok: true, value: 12 });
  });

  it("keeps an empty cell as not entered (null), never 0", () => {
    expect(parseImportNumber(null)).toEqual({ ok: true, value: null });
    expect(parseImportNumber("   ")).toEqual({ ok: true, value: null });
    expect(parseImportNumber("0")).toEqual({ ok: true, value: 0 });
  });

  it("rounds Excel number cells to agorot", () => {
    expect(parseImportNumber(1234.5600000001)).toEqual({ ok: true, value: 1234.56 });
  });

  it("rejects negatives, fractions in counts and text", () => {
    expect(parseImportNumber(-5).ok).toBe(false);
    expect(parseImportNumber("-5").ok).toBe(false);
    expect(parseImportNumber(2.5, { integer: true })).toEqual({ ok: false, message: "יש להזין מספר שלם" });
    expect(parseImportNumber("2.5", { integer: true }).ok).toBe(false);
    expect(parseImportNumber("abc").ok).toBe(false);
    expect(parseImportNumber("#DIV/0!").ok).toBe(false);
  });
});

describe("campaignKey", () => {
  it("ignores case and edge spaces, but not the platform", () => {
    expect(campaignKey("  Summer Sale ", "meta_ads")).toBe(campaignKey("summer sale", "meta_ads"));
    expect(campaignKey("Summer Sale", "meta_ads")).not.toBe(campaignKey("Summer Sale", "google_ads"));
  });
});
