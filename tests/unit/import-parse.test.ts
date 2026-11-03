import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { suggestMapping } from "@/lib/imports/mapping";
import { FILE_MESSAGES } from "@/lib/imports/messages";
import { validateRows } from "@/lib/imports/rows";
import { readImportFile } from "@/server/import/parse-file";
import { buildTemplate } from "@/server/import/template";

const fixture = (name: string) => ({
  name,
  bytes: new Uint8Array(readFileSync(new URL(`../fixtures/imports/${name}`, import.meta.url))),
});

function xlsx(rows: unknown[][], name = "data.xlsx") {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Sheet1");
  return { name, bytes: new Uint8Array(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })) };
}

function errorOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    return (error as Error).message;
  }
  return null;
}

describe("readImportFile — CSV", () => {
  it("reads a UTF-8 file with quoted values", () => {
    const table = readImportFile(fixture("valid.csv"));
    expect(table.headers[0]).toBe("שם קמפיין");
    expect(table.rows).toHaveLength(3);
    expect(table.rows[0]).toEqual({
      line: 2,
      cells: ["Import Alpha", "Facebook", "28/10/2026", "1,200", "20", "3", "2", "₪4,500"],
    });
  });

  it("strips the BOM", () => {
    expect(readImportFile(fixture("bom.csv")).headers[0]).toBe("שם קמפיין");
  });

  it("reads a Hebrew Windows-1255 file saved by Excel", () => {
    const table = readImportFile(fixture("hebrew-1255.csv"));
    expect(table.headers).toEqual(["שם קמפיין", "פלטפורמה", "תחילת שבוע", "הוצאה"]);
    expect(table.rows[0].cells[0]).toBe("קמפיין חורף");
  });

  it("skips blank lines but keeps line numbers, and names empty headers", () => {
    const csv = "שם קמפיין,,תחילת שבוע\n\nA,x,2026-10-25\n,,\nB,y,2026-10-25\n";
    const table = readImportFile({ name: "a.csv", bytes: new TextEncoder().encode(csv) });
    expect(table.headers).toEqual(["שם קמפיין", "עמודה 2", "תחילת שבוע"]);
    expect(table.rows.map((r) => r.line)).toEqual([3, 5]);
  });
});

describe("readImportFile — XLSX", () => {
  it("reads text, numbers and date cells from the first sheet", () => {
    const file = xlsx([
      ["שם קמפיין", "פלטפורמה", "תחילת שבוע", "הוצאה"],
      ["X", "Meta Ads", new Date(Date.UTC(2026, 9, 25)), 1234.5],
    ]);
    const table = readImportFile(file);
    const { valid, errors } = validateRows(table, suggestMapping(table.headers).mapping);
    expect(errors).toEqual([]);
    expect(valid[0]).toMatchObject({ name: "X", weekStart: "2026-10-25", spend: 1234.5 });
  });

  it("imports the Budgi sample file as it is", () => {
    const table = readImportFile({ name: "budgi-sample.xlsx", bytes: buildTemplate() });
    const { mapping, auto } = suggestMapping(table.headers);
    expect(auto).toBe(true);
    const { valid, errors } = validateRows(table, mapping);
    expect(errors).toEqual([]);
    expect(valid).toHaveLength(4);
    expect(valid[3]).toMatchObject({ platform: "google_ads", weekStart: "2026-10-11", deals: null });
  });
});

describe("readImportFile — rejected files", () => {
  it("rejects unsupported types, also when only the name looks right", () => {
    expect(errorOf(() => readImportFile(fixture("notes.txt")))).toBe(FILE_MESSAGES.unsupported);
    expect(errorOf(() => readImportFile({ name: "x.xls", bytes: new Uint8Array([1, 2, 3]) }))).toBe(FILE_MESSAGES.unsupported);
    expect(errorOf(() => readImportFile({ name: "fake.xlsx", bytes: new TextEncoder().encode("a,b\n1,2") }))).toBe(
      FILE_MESSAGES.unsupported,
    );
    expect(errorOf(() => readImportFile({ name: "bin.csv", bytes: new Uint8Array([0x41, 0, 0x42]) }))).toBe(
      FILE_MESSAGES.unsupported,
    );
  });

  it("rejects empty files and files without data rows", () => {
    expect(errorOf(() => readImportFile(fixture("empty.csv")))).toBe(FILE_MESSAGES.empty);
    expect(errorOf(() => readImportFile({ name: "a.csv", bytes: new TextEncoder().encode("\n,,\n") }))).toBe(FILE_MESSAGES.empty);
    expect(errorOf(() => readImportFile({ name: "a.csv", bytes: new TextEncoder().encode("שם קמפיין\n") }))).toBe(
      FILE_MESSAGES.noData,
    );
  });

  it("rejects files over 5MB and over 5,000 rows", () => {
    expect(errorOf(() => readImportFile({ name: "a.csv", bytes: new Uint8Array(5 * 1024 * 1024 + 1).fill(65) }))).toBe(
      FILE_MESSAGES.tooBig,
    );
    const many = "a\n" + "x\n".repeat(5001);
    expect(errorOf(() => readImportFile({ name: "a.csv", bytes: new TextEncoder().encode(many) }))).toBe(
      FILE_MESSAGES.tooManyRows,
    );
    expect(errorOf(() => readImportFile(xlsx([["a"], ...Array.from({ length: 5001 }, () => ["x"])])))).toBe(
      FILE_MESSAGES.tooManyRows,
    );
  });
});
