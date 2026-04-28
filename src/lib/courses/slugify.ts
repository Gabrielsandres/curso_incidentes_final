/**
 * Converts arbitrary text (including pt-BR diacritics) to a URL-safe slug.
 *
 * Algorithm:
 * 1. NFKD normalize — decomposes accented characters into base + combining mark
 * 2. Strip combining diacritical marks (Unicode block U+0300–U+036F)
 * 3. Lowercase and trim outer whitespace
 * 4. Remove any character that is not alphanumeric, space, or hyphen
 * 5. Collapse runs of spaces/hyphens into a single hyphen
 * 6. Strip leading/trailing hyphens
 */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (ã→a, ç→c, etc.)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // keep alphanumeric, space, hyphen
    .replace(/[\s-]+/g, "-") // collapse spaces/hyphens into one hyphen
    .replace(/^-+|-+$/g, ""); // strip leading/trailing hyphens
}
