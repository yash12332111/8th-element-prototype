export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function stripEdgePunct(s: string): string {
  return s.replace(/^[\s"'.,;:!?\-]+|[\s"'.,;:!?\-]+$/g, "");
}

export function wordCount(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}
