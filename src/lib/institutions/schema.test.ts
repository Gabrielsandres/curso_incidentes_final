// src/lib/institutions/schema.test.ts
//
// Wave 0 scaffold for INST-08 input validation.
// Production schemas created in plan 05-03.
//
// Pattern source: src/lib/courses/schema.test.ts (Zod schema validation pattern).

import { beforeEach, describe, expect, it, vi } from "vitest";

// Plan 05-03 will add:
// import {
//   createInstitutionSchema, updateInstitutionSchema,
//   attachMemberSchema, inviteMemberSchema,
//   promoteManagerSchema, demoteManagerSchema, detachMemberSchema,
// } from "./schema";

describe("createInstitutionSchema", () => {
  beforeEach(() => vi.clearAllMocks());

  it.todo("rejects empty name with 'Nome é obrigatório.'");
  it.todo("rejects slug with uppercase letters (regex /^[a-z0-9]+(?:-[a-z0-9]+)*$/)");
  it.todo("rejects slug with spaces");
  it.todo("rejects invalid email in contact_email");
  it.todo("treats contact_email '' as undefined (normalizeOptionalText preprocessor)");
  it.todo("accepts minimal valid payload { name, slug }");
  it.todo("trims leading/trailing whitespace from name");
});

describe("updateInstitutionSchema", () => {
  it.todo("requires institutionId UUID in addition to base fields");
  it.todo("rejects non-UUID institutionId");
});

describe("attachMemberSchema", () => {
  it.todo("requires institution_id (uuid) and profile_id (uuid)");
  it.todo("rejects non-uuid institution_id");
});

describe("inviteMemberSchema", () => {
  it.todo("requires institution_id (uuid), full_name (min 1), email (valid email)");
  it.todo("trims and lowercases email");
});

describe("promoteManagerSchema", () => {
  it.todo("requires institution_id, profile_id, institution_slug");
});

describe("detachMemberSchema", () => {
  it.todo("requires institution_id, profile_id, institution_slug");
});

// W-6 fix: sentinel wrapped in describe() block for consistent Vitest output.
describe("scaffold", () => {
  it("placeholder", () => {
    expect(true).toBe(true);
  });
});
