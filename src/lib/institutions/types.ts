// src/lib/institutions/types.ts
//
// TypeScript types for the Phase 5 (B2B Institution Manager) data layer.
// Mirrors the structure of src/lib/courses/types.ts.
//
// NOTE: the production institutions table (migration 0013) has columns
//   id, name, slug, contact_email, created_at, updated_at
// The plan 05-03 originally referenced a `contact_phone` column, but that
// column does not exist in the live schema. Adding it would require a new
// migration outside the scope of this plan, so types/schema/queries align
// with the actual DB. See 05-03-SUMMARY.md "Deviations" for details.

import type { Database } from "@/lib/database.types";

export type InstitutionRow = Database["public"]["Tables"]["institutions"]["Row"];
export type InstitutionInsert = Database["public"]["Tables"]["institutions"]["Insert"];
export type InstitutionUpdate = Database["public"]["Tables"]["institutions"]["Update"];

export type InstitutionMemberRow = Database["public"]["Tables"]["institution_members"]["Row"];

/**
 * Institution member role values are enforced by the DB CHECK constraint
 * (`role in ('student', 'manager')`) but are stored as plain text. This
 * narrowed string union is the application-layer contract.
 */
export type InstitutionMemberRole = "student" | "manager";

/** Augmented row used in admin list page — N members + flag if any is manager. */
export type InstitutionWithStats = InstitutionRow & {
  memberCount: number;
  hasManager: boolean;
};

/** Member row joined with profile name + email (email comes from auth.users via listUsers in 05-04). */
export type InstitutionMemberWithProfile = {
  profileId: string;
  fullName: string;
  email: string;
  role: InstitutionMemberRole;
  attachedAt: string;
};

/** Single cell in the gestor matrix: one student × one course. */
export type MatrixCell = {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  enrollmentExpired: boolean;
};

/** A row in the gestor matrix: one student with their per-course cells. */
export type InstitutionMemberWithProgress = {
  profileId: string;
  fullName: string;
  memberRole: InstitutionMemberRole;
  courses: MatrixCell[];
};

/** Certificate row for the gestor "Certificados emitidos" table (no download — D-15). */
export type InstitutionCertificateRow = {
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  certificateCode: string;
};
