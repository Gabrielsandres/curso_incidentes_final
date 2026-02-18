import { describe, expect, it } from "vitest";

import { createLessonSchema } from "./schema";

describe("createLessonSchema", () => {
  it("valida payload completo e normaliza descricao vazia", () => {
    const result = createLessonSchema.safeParse({
      moduleId: "11111111-1111-4111-8111-111111111111",
      title: "  Aula 1  ",
      description: "   ",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      position: "2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Aula 1");
      expect(result.data.description).toBeNull();
      expect(result.data.position).toBe(2);
    }
  });

  it("retorna erro quando moduleId nao eh uuid", () => {
    const result = createLessonSchema.safeParse({
      moduleId: "modulo-invalido",
      title: "Aula 1",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      position: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.moduleId).toBeDefined();
    }
  });

  it("retorna erro quando posicao eh menor que 1", () => {
    const result = createLessonSchema.safeParse({
      moduleId: "11111111-1111-4111-8111-111111111111",
      title: "Aula 1",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      position: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.position).toBeDefined();
    }
  });
});
