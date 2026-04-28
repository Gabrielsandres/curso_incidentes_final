import { describe, expect, it } from "vitest";

import { formatCertificateDate } from "@/lib/certificates/pdf";

describe("formatCertificateDate", () => {
  it("formats date in America/Sao_Paulo timezone — 02:00 UTC is previous day in SP", () => {
    // 2026-04-27T02:00:00Z == 2026-04-26T23:00:00 in America/Sao_Paulo (UTC-3)
    // Certificate must show the LOCAL date (26/04), not the UTC date (27/04)
    const utcEarlyMorning = new Date("2026-04-27T02:00:00Z");
    expect(formatCertificateDate(utcEarlyMorning)).toBe("26/04/2026");
  });

  it("formats midday UTC date correctly in SP — no day shift at 15:00 UTC", () => {
    // 2026-04-27T15:00:00Z == 2026-04-27T12:00:00 in SP — same calendar day
    const utcNoon = new Date("2026-04-27T15:00:00Z");
    expect(formatCertificateDate(utcNoon)).toBe("27/04/2026");
  });
});
