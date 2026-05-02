// src/lib/institutions/schema.ts
//
// Zod schemas for Phase 5 (B2B Institution Manager) inputs.
// Mirrors patterns from src/lib/courses/schema.ts (slugRegex, normalizeOptionalText preprocessor).
//
// pt-BR error messages match the UI-SPEC §Copywriting Contract.
//
// NOTE: contact_phone is NOT included — the institutions table (migration 0013)
// does not currently have a contact_phone column. See 05-03-SUMMARY.md.

import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

// ---------- Institution CRUD ----------

const baseInstitutionSchema = z.object({
  name: z
    .string({ required_error: "Nome é obrigatório." })
    .trim()
    .min(1, { message: "Nome é obrigatório." }),
  slug: z
    .string({ required_error: "Slug é obrigatório." })
    .trim()
    .min(1, { message: "Slug é obrigatório." })
    .regex(slugRegex, {
      message: "Use apenas letras minúsculas, números e hífens no slug.",
    }),
  // B-4 fix: use `.nullish()` instead of `.optional().transform(v => v ?? null)`.
  // The chained transform produced a fragile inferred type (`string | null`) that
  // didn't always flow cleanly into the Supabase Insert payload under strict TS.
  // `nullish()` accepts both `undefined` and `null` natively; consumers handle the
  // union directly. Mirrors the safer pattern from src/lib/courses/schema.ts.
  contact_email: z.preprocess(
    normalizeOptionalText,
    z.string().email({ message: "Informe um email válido." }).nullish(),
  ),
});

export const createInstitutionSchema = baseInstitutionSchema;

export const updateInstitutionSchema = baseInstitutionSchema.extend({
  institutionId: z
    .string({ required_error: "Instituição é obrigatória." })
    .uuid({ message: "Instituição inválida." }),
});

export type CreateInstitutionInput = z.infer<typeof createInstitutionSchema>;
export type UpdateInstitutionInput = z.infer<typeof updateInstitutionSchema>;

// ---------- Member management ----------

export const attachMemberSchema = z.object({
  institution_id: z
    .string({ required_error: "Instituição é obrigatória." })
    .uuid({ message: "Instituição inválida." }),
  profile_id: z
    .string({ required_error: "Aluno é obrigatório." })
    .uuid({ message: "Aluno inválido." }),
  institution_slug: z
    .string({ required_error: "Slug da instituição é obrigatório." })
    .min(1),
});

export const inviteMemberSchema = z.object({
  institution_id: z
    .string({ required_error: "Instituição é obrigatória." })
    .uuid({ message: "Instituição inválida." }),
  full_name: z
    .string({ required_error: "Nome é obrigatório." })
    .trim()
    .min(1, { message: "Nome é obrigatório." }),
  email: z
    .string({ required_error: "Email é obrigatório." })
    .trim()
    .toLowerCase()
    .email({ message: "Informe um email válido." }),
});

export const promoteManagerSchema = z.object({
  institution_id: z.string().uuid({ message: "Instituição inválida." }),
  profile_id: z.string().uuid({ message: "Aluno inválido." }),
  institution_slug: z.string().min(1, { message: "Slug é obrigatório." }),
});

export const demoteManagerSchema = promoteManagerSchema; // Same shape

export const detachMemberSchema = promoteManagerSchema; // Same shape

export type AttachMemberInput = z.infer<typeof attachMemberSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type PromoteManagerInput = z.infer<typeof promoteManagerSchema>;
export type DetachMemberInput = z.infer<typeof detachMemberSchema>;
