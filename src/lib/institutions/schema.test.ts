// src/lib/institutions/schema.test.ts
//
// Tests for INST-08 input validation. Production schemas in ./schema.ts.
// Pattern source: src/lib/courses/schema.test.ts (Zod schema validation).

import { describe, expect, it } from "vitest";

import {
  attachMemberSchema,
  createInstitutionSchema,
  demoteManagerSchema,
  detachMemberSchema,
  inviteMemberSchema,
  promoteManagerSchema,
  updateInstitutionSchema,
} from "./schema";

describe("createInstitutionSchema", () => {
  it("rejects empty name with 'Nome é obrigatório.'", () => {
    const result = createInstitutionSchema.safeParse({ name: "", slug: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name?.[0]).toBe("Nome é obrigatório.");
    }
  });

  it("rejects slug with uppercase letters (regex /^[a-z0-9]+(?:-[a-z0-9]+)*$/)", () => {
    const result = createInstitutionSchema.safeParse({ name: "X", slug: "Foo" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.slug?.[0]).toContain("letras minúsculas");
    }
  });

  it("rejects slug with spaces", () => {
    const result = createInstitutionSchema.safeParse({ name: "X", slug: "foo bar" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.slug?.[0]).toContain("letras minúsculas");
    }
  });

  it("rejects invalid email in contact_email", () => {
    const result = createInstitutionSchema.safeParse({
      name: "X",
      slug: "x",
      contact_email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.contact_email?.[0]).toBe(
        "Informe um email válido.",
      );
    }
  });

  it("treats contact_email '' as nullish (undefined or null) — normalizeOptionalText converts '' to undefined", () => {
    const result = createInstitutionSchema.safeParse({
      name: "X",
      slug: "x",
      contact_email: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // After B-4 fix the schema uses .nullish() (no transform). normalizeOptionalText
      // returns undefined for the empty string, so the parsed value is undefined.
      // Consumers (buildInstitutionPayload) coalesce undefined -> null at insert time
      // because the Supabase Insert column accepts string | null | undefined.
      expect(result.data.contact_email == null).toBe(true); // matches both undefined and null
    }
  });

  it("accepts minimal valid payload { name, slug }", () => {
    const result = createInstitutionSchema.safeParse({ name: "Colégio X", slug: "colegio-x" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Colégio X");
      expect(result.data.slug).toBe("colegio-x");
    }
  });

  it("trims leading/trailing whitespace from name", () => {
    const result = createInstitutionSchema.safeParse({ name: "  X  ", slug: "x" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("X");
    }
  });
});

describe("updateInstitutionSchema", () => {
  it("requires institutionId UUID in addition to base fields", () => {
    const validUuid = "11111111-1111-1111-1111-111111111111";
    const result = updateInstitutionSchema.safeParse({
      name: "X",
      slug: "x",
      institutionId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.institutionId).toBe(validUuid);
    }
  });

  it("rejects non-UUID institutionId", () => {
    const result = updateInstitutionSchema.safeParse({
      name: "X",
      slug: "x",
      institutionId: "not-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.institutionId?.[0]).toBe(
        "Instituição inválida.",
      );
    }
  });
});

describe("attachMemberSchema", () => {
  const validUuid = "22222222-2222-2222-2222-222222222222";

  it("requires institution_id (uuid) and profile_id (uuid)", () => {
    const result = attachMemberSchema.safeParse({
      institution_id: validUuid,
      profile_id: validUuid,
      institution_slug: "x",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-uuid institution_id", () => {
    const result = attachMemberSchema.safeParse({
      institution_id: "not-uuid",
      profile_id: validUuid,
      institution_slug: "x",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.institution_id?.[0]).toBe(
        "Instituição inválida.",
      );
    }
  });
});

describe("inviteMemberSchema", () => {
  const validUuid = "33333333-3333-3333-3333-333333333333";

  it("requires institution_id (uuid), full_name (min 1), email (valid email)", () => {
    const result = inviteMemberSchema.safeParse({
      institution_id: validUuid,
      full_name: "Aluno Novo",
      email: "aluno@exemplo.com",
    });
    expect(result.success).toBe(true);

    const missing = inviteMemberSchema.safeParse({
      institution_id: validUuid,
      full_name: "",
      email: "aluno@exemplo.com",
    });
    expect(missing.success).toBe(false);

    const badEmail = inviteMemberSchema.safeParse({
      institution_id: validUuid,
      full_name: "Aluno",
      email: "not-an-email",
    });
    expect(badEmail.success).toBe(false);
  });

  it("trims and lowercases email", () => {
    const result = inviteMemberSchema.safeParse({
      institution_id: validUuid,
      full_name: "Aluno",
      email: "  Aluno@Exemplo.COM  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("aluno@exemplo.com");
    }
  });
});

describe("promoteManagerSchema", () => {
  const validUuid = "44444444-4444-4444-4444-444444444444";

  it("requires institution_id, profile_id, institution_slug", () => {
    const result = promoteManagerSchema.safeParse({
      institution_id: validUuid,
      profile_id: validUuid,
      institution_slug: "colegio-x",
    });
    expect(result.success).toBe(true);

    // Missing institution_slug fails
    const missing = promoteManagerSchema.safeParse({
      institution_id: validUuid,
      profile_id: validUuid,
      institution_slug: "",
    });
    expect(missing.success).toBe(false);
  });

  // demoteManagerSchema and detachMemberSchema are aliases — sanity check they parse.
  it("demoteManagerSchema accepts the same shape", () => {
    const result = demoteManagerSchema.safeParse({
      institution_id: validUuid,
      profile_id: validUuid,
      institution_slug: "colegio-x",
    });
    expect(result.success).toBe(true);
  });
});

describe("detachMemberSchema", () => {
  const validUuid = "55555555-5555-5555-5555-555555555555";

  it("requires institution_id, profile_id, institution_slug", () => {
    const result = detachMemberSchema.safeParse({
      institution_id: validUuid,
      profile_id: validUuid,
      institution_slug: "colegio-x",
    });
    expect(result.success).toBe(true);

    const missing = detachMemberSchema.safeParse({
      institution_id: "not-uuid",
      profile_id: validUuid,
      institution_slug: "colegio-x",
    });
    expect(missing.success).toBe(false);
  });
});
