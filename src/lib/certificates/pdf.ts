import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

type BuildCourseCertificatePdfParams = {
  templateUrl: string;
  learnerName: string;
  courseTitle: string;
  workloadHours: number;
  issuedAt: Date;
  certificateCode: string;
};

type TemplateAsset = {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg";
};

type TextFieldPosition = {
  x: number;
  y: number;
  size: number;
};

const DEFAULT_CERTIFICATE_TEMPLATE = "/certificado_teste.png";
const CERTIFICATE_TEXT_COLOR = rgb(0.09, 0.12, 0.2);

const CERTIFICATE_FIELDS = {
  name: { x: 300, y: 430, size: 60 },
  course: { x: 260, y: 360, size: 34 },
  hours: { x: 700, y: 330, size: 32 },
  date: { x: 1220, y: 120, size: 20 },
  code: { x: 120, y: 120, size: 18 },
} as const satisfies Record<string, TextFieldPosition>;

export async function buildCourseCertificatePdf(params: BuildCourseCertificatePdfParams): Promise<Uint8Array> {
  const template = await loadTemplateAsset(params.templateUrl || DEFAULT_CERTIFICATE_TEMPLATE);

  const document = await PDFDocument.create();
  const image =
    template.mimeType === "image/png"
      ? await document.embedPng(template.bytes)
      : await document.embedJpg(template.bytes);

  const page = document.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await document.embedFont(StandardFonts.Helvetica);

  const safeLearnerName = params.learnerName.trim() || "Aluno";
  const safeCourseTitle = params.courseTitle.trim() || "Curso";
  const safeHours = String(params.workloadHours);
  const safeDate = formatCertificateDate(params.issuedAt);
  const safeCode = params.certificateCode.trim() || "-";

  drawTextAtPosition({
    page,
    pageWidth: page.getWidth(),
    field: CERTIFICATE_FIELDS.name,
    text: safeLearnerName,
    font: boldFont,
  });

  drawTextAtPosition({
    page,
    pageWidth: page.getWidth(),
    field: CERTIFICATE_FIELDS.course,
    text: safeCourseTitle,
    font: boldFont,
  });

  drawTextAtPosition({
    page,
    pageWidth: page.getWidth(),
    field: CERTIFICATE_FIELDS.hours,
    text: safeHours,
    font: boldFont,
  });

  drawTextAtPosition({
    page,
    pageWidth: page.getWidth(),
    field: CERTIFICATE_FIELDS.date,
    text: safeDate,
    font: regularFont,
  });

  drawTextAtPosition({
    page,
    pageWidth: page.getWidth(),
    field: CERTIFICATE_FIELDS.code,
    text: safeCode,
    font: regularFont,
  });

  return document.save();
}

function formatCertificateDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function drawTextAtPosition(params: {
  page: PDFPage;
  pageWidth: number;
  field: TextFieldPosition;
  text: string;
  font: PDFFont;
}) {
  let fontSize = params.field.size;
  const minFontSize = 12;
  const maxAllowedWidth = Math.max(120, params.pageWidth - params.field.x - 40);

  while (fontSize > minFontSize && params.font.widthOfTextAtSize(params.text, fontSize) > maxAllowedWidth) {
    fontSize -= 1;
  }

  params.page.drawText(params.text, {
    x: params.field.x,
    y: params.field.y,
    size: fontSize,
    font: params.font,
    color: CERTIFICATE_TEXT_COLOR,
  });
}

async function loadTemplateAsset(templateUrl: string): Promise<TemplateAsset> {
  const normalizedTemplateUrl = templateUrl.trim() || DEFAULT_CERTIFICATE_TEMPLATE;

  if (isHttpUrl(normalizedTemplateUrl)) {
    const response = await fetch(normalizedTemplateUrl);
    if (!response.ok) {
      throw new Error(`Falha ao baixar template do certificado (${response.status}).`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const mimeType = normalizeTemplateMimeType(response.headers.get("content-type"), normalizedTemplateUrl);
    return { bytes, mimeType };
  }

  if (!normalizedTemplateUrl.startsWith("/")) {
    throw new Error("Template do certificado deve iniciar com / ou ser uma URL http(s).");
  }

  const publicDirectory = path.resolve(process.cwd(), "public");
  const resolvedPath = path.resolve(publicDirectory, normalizedTemplateUrl.slice(1));
  if (!resolvedPath.startsWith(publicDirectory)) {
    throw new Error("Template do certificado invalido.");
  }

  const bytes = await readFile(resolvedPath);
  const mimeType = normalizeTemplateMimeType(null, normalizedTemplateUrl);

  return { bytes: new Uint8Array(bytes), mimeType };
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizeTemplateMimeType(contentType: string | null, templateUrl: string): "image/png" | "image/jpeg" {
  const normalizedContentType = (contentType ?? "").toLowerCase();
  if (normalizedContentType.includes("png")) {
    return "image/png";
  }

  if (normalizedContentType.includes("jpeg") || normalizedContentType.includes("jpg")) {
    return "image/jpeg";
  }

  const lowerUrl = templateUrl.toLowerCase();
  if (lowerUrl.endsWith(".png")) {
    return "image/png";
  }

  if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  throw new Error("Template do certificado deve ser PNG ou JPG.");
}
