const SHOE_TITLE_EXCEPTIONS = [
  /\b(low|mid|high)\s*[- ]\s*top\b/gi,
  /\btop\s*[- ]\s*sider\b/gi,
  /\bstreet\s+jogger\b/gi,
];

const KNOWN_VALID_SHOES = new Set([
  "speedcat dress-up sneakers",
  "hands free slip-ins - street jogger by mark nason with memory foam footbed",
]);

const NON_SHOE_RE = new RegExp(
  [
    String.raw`\btops?\b`,
    String.raw`\bt-shirt\b`,
    String.raw`\btees?\b`,
    String.raw`\btanks?\b`,
    String.raw`\bshirts?\b`,
    String.raw`\bpolos?\b`,
    String.raw`\bjerseys?\b`,
    String.raw`\btunics?\b`,
    String.raw`\bcrop top\b`,
    String.raw`\bpajamas?\b`,
    String.raw`\bpjs?\b`,
    String.raw`\bsleepwear\b`,
    String.raw`\bnightwear\b`,
    String.raw`\brobes?\b`,
    String.raw`\bpants?\b`,
    String.raw`\bjoggers?\b`,
    String.raw`\btrousers?\b`,
    String.raw`\bleggings?\b`,
    String.raw`\btights?\b`,
    String.raw`\bshorts?\b`,
    String.raw`\bsweatpants?\b`,
    String.raw`\bcapris?\b`,
    String.raw`\bbras?\b`,
    String.raw`\bunderwear\b`,
    String.raw`\bboxers?\b`,
    String.raw`\bbriefs?\b`,
    String.raw`\bthong\b`,
    String.raw`\bpanties\b`,
    String.raw`\bswim\b`,
    String.raw`\bbikini\b`,
    String.raw`\bswimsuit\b`,
    String.raw`\btrunks?\b`,
    String.raw`\bdresses?\b`,
    String.raw`\bskirts?\b`,
    String.raw`\bromper\b`,
    String.raw`\bonesie\b`,
    String.raw`\bjumpsuit\b`,
    String.raw`\bhoodies?\b`,
    String.raw`\bsweatshirts?\b`,
    String.raw`\bsweaters?\b`,
    String.raw`\bjackets?\b`,
    String.raw`\bcoats?\b`,
    String.raw`\bvests?\b`,
    String.raw`\bpullovers?\b`,
    String.raw`\bwindbreaker\b`,
    String.raw`\banorak\b`,
    String.raw`\btracksuit\b`,
    String.raw`\bfleece\b`,
    String.raw`\bouterwear\b`,
    String.raw`\bparka\b`,
    String.raw`\bsocks?\b`,
    String.raw`\bhats?\b`,
    String.raw`\bcaps?\b`,
    String.raw`\bbeanie\b`,
    String.raw`\bvisor\b`,
    String.raw`\bbags?\b`,
    String.raw`\bbackpack\b`,
    String.raw`\btote\b`,
    String.raw`\bduffel\b`,
    String.raw`\bgloves?\b`,
    String.raw`\bscarf\b`,
    String.raw`\bheadband\b`,
    String.raw`\bwristband\b`,
    String.raw`\bbelt\b`,
    String.raw`\bkids?\b`,
    String.raw`\btoddlers?\b`,
    String.raw`\binfants?\b`,
    String.raw`\bbaby\b`,
    String.raw`\bbabies\b`,
    String.raw`\blittle kid\b`,
    String.raw`\bbig kid\b`,
    String.raw`\bboys?\b`,
    String.raw`\bgirls?\b`,
    String.raw`\byouth\b`,
    String.raw`\bchildren\b`,
    String.raw`\bchild\b`,
    String.raw`\bpreschool\b`,
    String.raw`\bgrade school\b`,
    String.raw`\bapparel\b`,
    String.raw`\bclothing\b`,
  ].join("|"),
  "i",
);

export function hasProductImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const value = url.trim().toLowerCase();
  if (!value || value === "none" || value === "null" || value === "n/a") return false;
  return value.startsWith("https://") || value.startsWith("http://");
}

export function isNonShoeTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  if (KNOWN_VALID_SHOES.has(title.toLowerCase().trim())) return false;
  let cleaned = title;
  for (const exception of SHOE_TITLE_EXCEPTIONS) {
    cleaned = cleaned.replace(exception, " ");
  }
  return NON_SHOE_RE.test(cleaned);
}
