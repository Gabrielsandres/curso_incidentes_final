import { z } from "zod";

export const createLessonSchema = z.object({
  moduleId: z
    .string({ required_error: "Selecione um módulo" })
    .uuid({ message: "Selecione um módulo válido." }),
  title: z
    .string({ required_error: "Informe um título" })
    .trim()
    .min(1, { message: "Título é obrigatório." }),
  description: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  videoUrl: z
    .string({ required_error: "Informe a URL do vídeo" })
    .trim()
    .url({ message: "Informe uma URL válida." }),
  position: z.coerce
    .number({ required_error: "Informe a posição na ordem do módulo" })
    .int({ message: "Posição deve ser um número inteiro." })
    .min(1, { message: "Posição mínima é 1." }),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
