import { describe, expect, it } from "vitest";

import { createLessonSchema } from "./schema";

const BASE_VALID = {
  courseId: "22222222-2222-4222-8222-222222222222",
  moduleId: "11111111-1111-4111-8111-111111111111",
  title: "Aula 1",
  position: 1,
};

describe("createLessonSchema", () => {
  it("valida payload completo e normaliza descricao vazia", () => {
    const result = createLessonSchema.safeParse({
      ...BASE_VALID,
      description: "   ",
      videoProvider: "youtube",
      videoExternalId: "dQw4w9WgXcQ",
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
      courseId: "22222222-2222-4222-8222-222222222222",
      moduleId: "modulo-invalido",
      title: "Aula 1",
      position: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.moduleId).toBeDefined();
    }
  });

  it("retorna erro quando posicao eh menor que 1", () => {
    const result = createLessonSchema.safeParse({
      ...BASE_VALID,
      position: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.position).toBeDefined();
    }
  });

  it("aceita payload sem campos de video (videoProvider e videoExternalId opcionais)", () => {
    const result = createLessonSchema.safeParse(BASE_VALID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.videoProvider).toBeNull();
      expect(result.data.videoExternalId).toBeNull();
    }
  });

  it("aceita videoProvider e videoExternalId quando fornecidos", () => {
    const result = createLessonSchema.safeParse({
      ...BASE_VALID,
      videoProvider: "bunny",
      videoExternalId: "abc-123-guid",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.videoProvider).toBe("bunny");
      expect(result.data.videoExternalId).toBe("abc-123-guid");
    }
  });

  it("transforma videoProvider vazio em null", () => {
    const result = createLessonSchema.safeParse({
      ...BASE_VALID,
      videoProvider: "   ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.videoProvider).toBeNull();
    }
  });

  it("nao exige videoUrl (campo removido como obrigatorio)", () => {
    // Should succeed without videoUrl — previously would have failed
    const result = createLessonSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
  });
});
