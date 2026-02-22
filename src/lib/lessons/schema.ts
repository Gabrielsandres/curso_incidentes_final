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
