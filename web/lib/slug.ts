export function cleanTitle(raw: string): string {
  if (!raw) return "Untitled";
  let title = raw.trim();

  // Collapse repeated gender/audience prefixes e.g. "Men Men's" -> "Men's", "Women Women's" -> "Women's"
  title = title.replace(/\bMen\s+Men's\b/gi, "Men's");
  title = title.replace(/\bWomen\s+Women's\b/gi, "Women's");
  title = title.replace(/\bKids\s+Kids'\b/gi, "Kids'");
  title = title.replace(/\bMen's\s+Men's\b/gi, "Men's");
  title = title.replace(/\bWomen's\s+Women's\b/gi, "Women's");

  // Trim trailing fragments e.g. " - ", " | ", trailing punctuation or isolated fragments
  title = title.replace(/[\s\-_|/]+$/g, "");

  return title.trim();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

export function makeProductSlug(title: string, id: string): string {
  const cleaned = cleanTitle(title);
  const baseSlug = slugify(cleaned) || "product";
  return `${baseSlug}--${id}`;
}

export function parseIdFromSlug(slugOrId: string): string {
  if (!slugOrId) return "";
  const lastIndex = slugOrId.lastIndexOf("--");
  if (lastIndex !== -1) {
    return slugOrId.substring(lastIndex + 2);
  }
  return slugOrId;
}

