import { describe, expect, it } from "vitest";

import {
  ALLOWED_MATERIAL_MIME_TYPES,
  assertUploadable,
  validateMaterialFile,
} from "@/lib/materials/storage";

// Helper: create a fake File with specific size and MIME
function makeFile(sizeBytes: number, mimeType: string, name = "test.pdf"): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type: mimeType });
}

describe("ALLOWED_MATERIAL_MIME_TYPES", () => {
  it("contains application/pdf", () => {
    expect(ALLOWED_MATERIAL_MIME_TYPES.has("application/pdf")).toBe(true);
  });
  it("does not contain application/zip", () => {
    expect(ALLOWED_MATERIAL_MIME_TYPES.has("application/zip")).toBe(false);
  });
});

describe("validateMaterialFile (existing — smoke)", () => {
  it("rejects files larger than 20MB", () => {
    const result = validateMaterialFile(makeFile(25 * 1024 * 1024, "application/pdf"));
    expect(result.ok).toBe(false);
  });
});

describe("assertUploadable", () => {
  it("accepts PDF within size limit", () => {
    const result = assertUploadable(makeFile(1 * 1024 * 1024, "application/pdf"));
    expect(result.ok).toBe(true);
  });
  it("accepts .docx MIME type", () => {
    const result = assertUploadable(
      makeFile(
        1 * 1024 * 1024,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    );
    expect(result.ok).toBe(true);
  });
  it("accepts image/jpeg", () => {
    const result = assertUploadable(makeFile(5 * 1024 * 1024, "image/jpeg", "photo.jpg"));
    expect(result.ok).toBe(true);
  });
  it("rejects application/zip MIME (with valid extension) with pt-BR error", () => {
    // File extension is valid (.pdf) but MIME type is disallowed — tests the MIME check path
    const result = assertUploadable(makeFile(1 * 1024 * 1024, "application/zip", "disguised.pdf"));
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/não suportado/i);
  });
  it("rejects file exceeding 20MB even with valid MIME", () => {
    const result = assertUploadable(makeFile(25 * 1024 * 1024, "application/pdf"));
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/20/);
  });
  it("passes through when MIME is empty string (extension already validated)", () => {
    const result = assertUploadable(makeFile(1 * 1024 * 1024, "", "doc.pdf"));
    expect(result.ok).toBe(true);
  });
});
