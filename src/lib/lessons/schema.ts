import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value !== "string") {
      return value;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  },
  z.string().optional(),
);

const optionalUrlString = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value !== "string") {
      return value;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  },
  z.string().url({ message: "Informe uma URL valida para o material complementar." }).optional(),
);

const materialTypeSchema = z.enum(["PDF", "LINK", "ARQUIVO", "OUTRO"]);
const materialSourceSchema = z.enum(["LINK", "UPLOAD"]);

export const createLessonSchema = z
  .object({
    courseId: z.string({ required_error: "Selecione um curso" }).uuid({ message: "Selecione um curso valido." }),
    moduleId: z.string({ required_error: "Selecione um modulo" }).uuid({ message: "Selecione um modulo valido." }),
    title: z
      .string({ required_error: "Informe um titulo" })
      .trim()
      .min(1, { message: "Titulo e obrigatorio." }),
    description: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    videoUrl: z.string({ required_error: "Informe a URL do video" }).trim().url({ message: "Informe uma URL valida." }),
    position: z.coerce
      .number({ required_error: "Informe a posicao na ordem do modulo" })
      .int({ message: "Posicao deve ser um numero inteiro." })
      .min(1, { message: "Posicao minima e 1." }),
    materialLabel: optionalTrimmedString,
    materialDescription: optionalTrimmedString,
    materialUrl: optionalUrlString,
    materialSource: z.preprocess(
      (value) => {
        if (value === null || value === undefined) {
          return undefined;
        }

        return typeof value === "string" && value.trim().length > 0 ? value.trim().toUpperCase() : undefined;
      },
      materialSourceSchema.optional(),
    ),
    materialHasFile: z.preprocess((value) => value === true || value === "true", z.boolean().optional()),
    materialType: z.preprocess(
      (value) => {
        if (value === null || value === undefined) {
          return undefined;
        }

        return typeof value === "string" && value.trim().length > 0 ? value.trim().toUpperCase() : undefined;
      },
      materialTypeSchema.optional(),
    ),
  })
  .superRefine((data, ctx) => {
    const hasAnyMaterialField = Boolean(
      data.materialLabel || data.materialDescription || data.materialUrl || data.materialType || data.materialHasFile,
    );

    if (!hasAnyMaterialField) {
      return;
    }

    if (!data.materialLabel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["materialLabel"],
        message: "Informe o titulo do material complementar.",
      });
    }

    const source = data.materialSource ?? "LINK";

    if (source === "LINK" && !data.materialUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["materialUrl"],
        message: "Informe a URL do material complementar.",
      });
    }
  });

export type CreateLessonInput = z.infer<typeof createLessonSchema>;

// --- Phase 2: update / delete / restore / reorder schemas ---
const nullableOptionalString = z.preprocess(
  (v) => (v === null || v === undefined ? undefined : v),
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
);

export const updateLessonSchema = z.object({
  lessonId: z.string().uuid({ message: "Aula inválida." }),
  title: z.string().trim().min(1, { message: "Título da aula é obrigatório." }),
  description: nullableOptionalString,
  videoProvider: nullableOptionalString,
  videoExternalId: nullableOptionalString,
  workloadMinutes: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
});

export const deleteLessonSchema = z.object({
  lessonId: z.string().uuid({ message: "Aula inválida." }),
});

export const restoreLessonSchema = z.object({
  lessonId: z.string().uuid({ message: "Aula inválida." }),
});

export const reorderLessonSchema = z.object({
  lessonId: z.string().uuid({ message: "Aula inválida." }),
  direction: z.enum(["up", "down"]),
});

export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
