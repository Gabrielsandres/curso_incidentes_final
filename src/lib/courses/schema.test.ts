import { describe, expect, it } from "vitest";

import { createCourseSchema } from "@/lib/courses/schema";

describe("createCourseSchema", () => {
  it("permite curso sem certificado habilitado", () => {
    const result = createCourseSchema.safeParse({
      slug: "curso-sem-certificado",
      title: "Curso sem certificado",
      description: "",
      coverImageUrl: "",
      certificateEnabled: false,
      certificateTemplateUrl: "",
      certificateWorkloadHours: "",
      certificateSignerName: "",
      certificateSignerRole: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.certificateEnabled).toBe(false);
      expect(result.data.certificateTemplateUrl).toBeUndefined();
      expect(result.data.certificateWorkloadHours).toBeUndefined();
      expect(result.data.certificateSignerName).toBeUndefined();
      expect(result.data.certificateSignerRole).toBeUndefined();
    }
  });

  it("exige campos obrigatorios quando certificado esta habilitado", () => {
    const result = createCourseSchema.safeParse({
      slug: "curso-com-certificado",
      title: "Curso com certificado",
      certificateEnabled: "on",
      certificateTemplateUrl: "",
      certificateWorkloadHours: "",
      certificateSignerName: "",
      certificateSignerRole: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.certificateTemplateUrl?.[0]).toContain("template");
      expect(fieldErrors.certificateWorkloadHours?.[0]).toContain("carga");
      expect(fieldErrors.certificateSignerName?.[0]).toContain("nome");
      expect(fieldErrors.certificateSignerRole?.[0]).toContain("cargo");
    }
  });

  it("normaliza valores validos de certificado quando habilitado", () => {
    const result = createCourseSchema.safeParse({
      slug: "curso-certificado-ok",
      title: "Curso certificado",
      description: "  teste  ",
      coverImageUrl: "/capa_curso.png",
      certificateEnabled: "on",
      certificateTemplateUrl: "/certificado_teste.png",
      certificateWorkloadHours: "60",
      certificateSignerName: "  Equipe Pedagogica  ",
      certificateSignerRole: "  Coordenacao  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.certificateEnabled).toBe(true);
      expect(result.data.certificateTemplateUrl).toBe("/certificado_teste.png");
      expect(result.data.certificateWorkloadHours).toBe(60);
      expect(result.data.certificateSignerName).toBe("Equipe Pedagogica");
      expect(result.data.certificateSignerRole).toBe("Coordenacao");
    }
  });
});
