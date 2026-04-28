import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { submitInstitutionalLead } from "./create-institutional-lead";

const initialState = { success: false, message: "" };

function makeAdminSupabase(insertResult: { data: unknown; error: unknown }) {
  const insertMock = vi.fn().mockResolvedValue(insertResult);
  const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
  return { client: { from: fromMock }, insertMock };
}

// Simulates the browser form: all visible inputs are present (possibly as empty strings).
// Optional fields not filled by the user arrive as "" from the HTML form.
function makeBaseFormData() {
  const formData = new FormData();
  formData.set("organization", "Escola Nova");
  formData.set("contactName", "Maria Silva");
  formData.set("email", "maria@escola.edu.br");
  formData.set("phone", "");
  formData.set("headcount", "");
  formData.set("message", "");
  return formData;
}

describe("submitInstitutionalLead — UTM fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persiste utm_source/utm_medium/utm_campaign quando presentes no formData", async () => {
    const { client, insertMock } = makeAdminSupabase({ data: null, error: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      client as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const formData = makeBaseFormData();
    formData.set("utmSource", "linkedin");
    formData.set("utmMedium", "post");
    formData.set("utmCampaign", "mdhe-q2");

    const result = await submitInstitutionalLead(initialState, formData);

    expect(result.success).toBe(true);
    expect(insertMock).toHaveBeenCalledOnce();
    const insertArg = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.utm_source).toBe("linkedin");
    expect(insertArg.utm_medium).toBe("post");
    expect(insertArg.utm_campaign).toBe("mdhe-q2");
  });

  it("persiste utm_source/utm_medium/utm_campaign como null quando ausentes no formData", async () => {
    const { client, insertMock } = makeAdminSupabase({ data: null, error: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      client as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    // No UTM fields set — simulates a visit without UTM query params
    const formData = makeBaseFormData();

    const result = await submitInstitutionalLead(initialState, formData);

    expect(result.success).toBe(true);
    expect(insertMock).toHaveBeenCalledOnce();
    const insertArg = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.utm_source).toBeNull();
    expect(insertArg.utm_medium).toBeNull();
    expect(insertArg.utm_campaign).toBeNull();
  });

  it("retorna sucesso com mensagem correta (regressão)", async () => {
    const { client } = makeAdminSupabase({ data: null, error: null });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      client as unknown as ReturnType<typeof createSupabaseAdminClient>,
    );

    const result = await submitInstitutionalLead(initialState, makeBaseFormData());

    expect(result.success).toBe(true);
    expect(result.message).toContain("Recebemos suas informações");
  });
});
